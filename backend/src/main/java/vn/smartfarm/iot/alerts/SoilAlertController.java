package vn.smartfarm.iot.alerts;
import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestController
@RequestMapping("/api/v1/soil-alerts")
public class SoilAlertController {
    private final SoilAlerts service;private final vn.smartfarm.iot.nodes.WaterTelemetry json;
    public SoilAlertController(SoilAlerts service,vn.smartfarm.iot.nodes.WaterTelemetry json){this.service=service;this.json=json;}
    @GetMapping public List<SoilAlerts.Alert> list(){return service.list();}
    @GetMapping("/{id}") public SoilAlerts.Alert find(@PathVariable long id){return service.find(id);}
    @PutMapping("/{id}/acknowledgement") public SoilAlerts.Alert acknowledge(@PathVariable long id,@RequestBody byte[] bytes){
        JsonNode body;
        try{body=json.object(bytes);}catch(IllegalArgumentException error){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid acknowledgement body");}
        if(body==null||!body.isObject()||body.size()!=1||!body.has("note")||!(body.get("note").isNull()||body.get("note").isTextual()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Only a text/null note is accepted");
        return service.acknowledge(id,body.get("note").isNull()?null:body.get("note").textValue());
    }
}
