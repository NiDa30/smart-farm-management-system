package vn.smartfarm.iot.nodes;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/nodes")
public class NodeController {
    private final NodeInventory inventory;private final WaterTelemetry water;
    public NodeController(NodeInventory inventory,WaterTelemetry water){this.inventory=inventory;this.water=water;}
    @GetMapping public NodeInventory.Snapshot list(){return inventory.snapshot();}
    @GetMapping("/{id}") public ResponseEntity<NodeInventory.Node> detail(@PathVariable String id){
        return ResponseEntity.of(inventory.snapshot().nodes().stream().filter(n->n.nodeId().equals(id)).findFirst());
    }
    @PostMapping public ResponseEntity<NodeInventory.Node> create(@RequestBody byte[] input){
        return create(input,false);
    }
    @PostMapping("/soil") public ResponseEntity<NodeInventory.Node> createSoil(@RequestBody byte[] input){return create(input,true);}
    private ResponseEntity<NodeInventory.Node> create(byte[] input,boolean soil){
        String id;
        try{id=soil?inventory.registerSoil(water.object(input)):inventory.registerWater(water.object(input));}
        catch(IllegalArgumentException error){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid node declaration");}
        catch(DataIntegrityViolationException error){throw new ResponseStatusException(HttpStatus.CONFLICT,"Identity already exists or registry changed");}
        return ResponseEntity.created(URI.create("/api/v1/nodes/"+id)).body(inventory.snapshot().nodes().stream().filter(n->n.nodeId().equals(id)).findFirst().orElseThrow());
    }
}
