package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;
import java.util.zip.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Pure public export. No SDK, credential lookup, device registration or transport. */
@Service
public class CircuitMonitorPackage {
    public static final String REGION="ap-southeast-1";
    public static final List<String> PUBLIC_FILES=List.of("src/main.cpp","include/ValveModel.h",
        "include/ValveFeedback.h","include/ValveMonitor.h","include/ValvePacket.h",
        "config/config.example.h","platformio.ini","diagram.json","wokwi.toml");
    public record Download(String filename,IrrigationCircuits.Config config,byte[] bytes) {}
    private final JdbcTemplate jdbc; private final ObjectMapper mapper; private final IrrigationCircuits circuits;
    public CircuitMonitorPackage(JdbcTemplate jdbc,ObjectMapper mapper,IrrigationCircuits circuits){this.jdbc=jdbc;this.mapper=mapper;this.circuits=circuits;}

    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Download export(String id,int expectedRevision,int expectedZoneRevision,String accountId){
        if(id==null||!id.matches("[A-Z][A-Z0-9_-]{1,31}")||accountId==null||!accountId.matches("[0-9]{12}")||expectedRevision<1||expectedZoneRevision<1)
            throw bad(HttpStatus.BAD_REQUEST,"12-digit account and positive reviewed revisions required");
        var c=circuits.find(id);
        if(c.revision()!=expectedRevision||c.zoneRevision()!=expectedZoneRevision||!IrrigationCircuits.configurationState(jdbc,c).equals("CURRENT"))
            throw bad(HttpStatus.CONFLICT,"Circuit or zone changed; reload before export");
        if(!c.zoneId().matches("[A-Z][A-Z0-9_-]{1,31}")||!c.expectedSource().equals("SIMULATOR")||!c.controllerId().matches("IRRIGATION(0[2-9]|[1-9][0-9])")||!c.valveId().matches("VALVE(0[2-9]|[1-9][0-9])"))
            throw bad(HttpStatus.CONFLICT,"Package supports separate monitor boards 02..99 only");
        if(jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_circuit WHERE controller_id=?",Integer.class,c.controllerId())!=1)
            throw bad(HttpStatus.CONFLICT,"One monitor board per valve requires a distinct controller client ID");
        try{return render(c,accountId,Instant.now());}
        catch(IOException|java.security.NoSuchAlgorithmException e){throw new IllegalStateException("Public firmware package unavailable",e);}
    }

    private Download render(IrrigationCircuits.Config c,String account,Instant at)throws IOException,java.security.NoSuchAlgorithmException {
        String root="FARM001-"+c.circuitId()+"-r"+c.revision()+"-"+c.controllerId()+"-"+c.valveId()+"-monitor";
        var files=new TreeMap<String,byte[]>();
        for(String path:PUBLIC_FILES){
            try(var in=new ClassPathResource("public-firmware/irrigation-monitor/"+path).getInputStream()){
                byte[] bytes=in.readNBytes(65537);if(bytes.length>65536)throw new IOException("Oversized public template");files.put(path,bytes);
            }
        }
        String config=new String(files.get("config/config.example.h"),StandardCharsets.UTF_8);
        // A public template accidentally populated with credentials must not become an export.
        for(String key:List.of("IRRIGATION_AWS_ENDPOINT","IRRIGATION_WIFI_PASSWORD"))
            if(!Pattern.compile("(?m)^#define "+key+" \"\"$").matcher(config).find())throw new IOException("Expected blank public template");
        var macros=new LinkedHashMap<String,String>();
        macros.put("IRRIGATION_DEMO_ENABLED","0");macros.put("IRRIGATION_SIMULATOR","1");
        macros.put("IRRIGATION_MONITOR_ONLY","1");macros.put("IRRIGATION_POSITION_FEEDBACK_ENABLED","1");
        macros.put("IRRIGATION_CONTROLLER_ID","\""+c.controllerId()+"\"");macros.put("IRRIGATION_VALVE_ID","\""+c.valveId()+"\"");
        macros.put("IRRIGATION_CIRCUIT_ID","\""+c.circuitId()+"\"");macros.put("IRRIGATION_CIRCUIT_REVISION",Integer.toString(c.revision()));
        macros.put("IRRIGATION_ZONE_ID","\""+c.zoneId()+"\"");macros.put("IRRIGATION_ZONE_REVISION",Integer.toString(c.zoneRevision()));
        for(var entry:macros.entrySet()){
            var pattern=Pattern.compile("(?m)^#define "+entry.getKey()+" [^\\r\\n]+$");
            if(pattern.matcher(config).results().count()!=1)throw new IOException("Ambiguous public macro "+entry.getKey());
            config=pattern.matcher(config).replaceFirst(java.util.regex.Matcher.quoteReplacement("#define "+entry.getKey()+" "+entry.getValue()));
        }
        files.put("config/config.example.h",utf8(config));
        var diagram=mapper.readTree(files.get("diagram.json"));
        for(var part:diagram.path("parts"))if(part.path("id").asText().equals("valve"))((ObjectNode)part.path("attrs")).put("label",c.valveId()+" monitor GPIO OFF");
        files.put("diagram.json",mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(diagram));
        files.put("data/.gitkeep",new byte[0]);
        files.put(".gitignore",utf8(".pio/\nconfig/config.local.h\ndata/*\n!data/.gitkeep\n*.pem\n*.key\n*.crt\n"));
        String prefix="arn:aws:iot:"+REGION+":"+account+":";String topic="smartfarm/FARM001/"+c.valveId()+"/status";
        files.put("device-policy.json",json(policy(List.of(statement("iot:Connect",prefix+"client/"+c.controllerId()),statement("iot:Publish",prefix+"topic/"+topic)))));
        files.put("backend-additional-identity-policy.json",json(policy(List.of(statement("iot:Subscribe",prefix+"topicfilter/"+topic),statement("iot:Receive",prefix+"topic/"+topic)))));
        files.put("README_VI.md",utf8(readme(c,root,at)));
        var manifest=mapper.createObjectNode().put("packageVersion",1).put("profile","IRRIGATION_MONITOR_ONLY")
            .put("farmId","FARM001").put("region",REGION).put("accountId",account).put("generatedAt",at.toString())
            .put("statusTopic",topic).put("monitorOnly",true).put("outputEnabled",false).put("provisioned",false);
        manifest.set("circuit",mapper.valueToTree(c));
        var hashes=manifest.putObject("filesSha256");
        for(var file:files.entrySet())hashes.put(file.getKey(),HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(file.getValue())));
        files.put("manifest.json",json(manifest));
        var out=new ByteArrayOutputStream();
        try(var zip=new ZipOutputStream(out,StandardCharsets.UTF_8)){
            for(var file:files.entrySet()){
                var entry=new ZipEntry(root+"/"+file.getKey());entry.setTimeLocal(LocalDateTime.of(1980,1,1,0,0));
                zip.putNextEntry(entry);zip.write(file.getValue());zip.closeEntry();
            }
        }
        if(out.size()>262144)throw new IOException("Oversized public package");
        return new Download(root+".zip",c,out.toByteArray());
    }
    private Map<String,Object> statement(String action,String resource){return Map.of("Effect","Allow","Action",action,"Resource",resource);}
    private Map<String,Object> policy(List<Map<String,Object>> statements){return Map.of("Version","2012-10-17","Statement",statements);}
    // Map.of iteration order may change across JVMs; keep file hashes stable on restart.
    private byte[] json(Object value)throws IOException{return mapper.writerWithDefaultPrettyPrinter().with(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS).writeValueAsBytes(value);}
    private static byte[] utf8(String value){return value.getBytes(StandardCharsets.UTF_8);}
    private static ResponseStatusException bad(HttpStatus s,String m){return new ResponseStatusException(s,m);}
    private String readme(IrrigationCircuits.Config c,String root,Instant at){return """
        # Gói Wokwi giám sát van riêng — %s

        Tạo lúc %s (UTC+07). Chỉ là cấu hình công khai, chưa provision hoặc xác nhận thiết bị chạy.
        Nhánh %s v%d; vùng %s v%d; controller/client %s; actuator %s.
        Region cố định ap-southeast-1. Khi mapping đổi phải tải lại gói, build và boot mới.

        ## Chuẩn bị trên Windows

        1. Giải nén vào thư mục riêng tại .local/simulators/ trong repository. Không ghi đè board đang dùng.
        2. Copy config/config.example.h sang config/config.local.h của PROJECT NÀY. Điền endpoint Data-ATS riêng tư.
        3. Dùng certificate/private key RIÊNG của controller này, không dùng key ENV/WATER/SOIL/van khác.
           Giữ device.pem.crt, private.pem.key, AmazonRootCA1.pem trong data/ của project riêng, không đưa vào Git/chat/Wokwi công khai.
        4. device-policy.json là IoT policy cho certificate; backend-additional-identity-policy.json là quyền IAM BỔ SUNG
           đọc status, không thay toàn bộ quyền backend hoặc tạo certificate. Kiểm tra account/region trước khi áp thủ công.
        5. Backend cần SMARTFARM_IRRIGATION_MONITOR_ENABLED=true và restart để nhận topic mới; MQTT dùng cấu hình riêng sẵn có.

        ## Build tại gốc repository trong Git Bash

        ```bash
        SIM_PROJECT='.local/simulators/%s'
        ./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir "$SIM_PROJECT"
        ./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir "$SIM_PROJECT" --target buildfs
        ./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py --project-dir "$SIM_PROJECT"
        ```

        Dừng khi một lệnh lỗi. Mở diagram.json từ project riêng bằng extension Wokwi đã có license và gateway.
        GPIO26 luôn OFF, không subscribe command hoặc publish ACK. LED OFF là đúng trong profile giám sát.
        Đổi hai switch độc lập: CLOSED GPIO32 / OPEN GPIO33, active LOW. Không nối chúng vào GPIO26.
        Vào Điều khiển Actuator → Cấu hình nhánh tưới để xem đúng van; nhận packet mới mới có phản hồi.
        Mỗi board đang chạy đồng thời cần controller/client ID khác nhau. Một board hiện báo một van.
        Lỗi monitor latch cần sửa đầu vào và boot mới; không có lệnh CLOSE/reset trong profile này.

        manifest.json chụp mapping và SHA-256 của các file khác trong gói; hash không phải chữ ký số.
        Không có endpoint/certificate/private key; chỉ tải gói chưa tạo tài nguyên AWS, chưa điều khiển bơm/van.
        Khi chạy MQTT có thể phát sinh usage theo tài khoản AWS. Chưa nghiệm thu Windows/AWS/Wokwi thật trong cloud.
        """.formatted(c.circuitId(),DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(at.atZone(ZoneId.of("Asia/Ho_Chi_Minh"))),
            c.circuitId(),c.revision(),c.zoneId(),c.zoneRevision(),c.controllerId(),c.valveId(),root);}
}
