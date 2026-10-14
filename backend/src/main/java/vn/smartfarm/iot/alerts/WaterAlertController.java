package vn.smartfarm.iot.alerts;
import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestController
@RequestMapping("/api/v1/water-alerts")
public class WaterAlertController {
    private final WaterAlerts service;
    public WaterAlertController(WaterAlerts service){this.service=service;}
    @GetMapping public List<WaterAlerts.Alert> list(){return service.list();}
    @GetMapping("/{id}") public WaterAlerts.Alert find(@PathVariable long id){return service.find(id);}
    @PutMapping("/{id}/acknowledgement") public WaterAlerts.Alert acknowledge(@PathVariable long id,@RequestBody JsonNode body){
        if(body==null||!body.isObject()||body.size()!=1||!body.has("note")||!(body.get("note").isNull()||body.get("note").isTextual()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Only a text/null note is accepted");
        return service.acknowledge(id,body.get("note").isNull()?null:body.get("note").textValue());
    }
}
