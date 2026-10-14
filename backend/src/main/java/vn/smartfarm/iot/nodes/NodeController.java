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
        String id;
        try{id=inventory.registerWater(water.object(input));}
        catch(IllegalArgumentException error){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid water node declaration");}
        catch(DataIntegrityViolationException error){throw new ResponseStatusException(HttpStatus.CONFLICT,"Identity already exists or registry changed");}
        return ResponseEntity.created(URI.create("/api/v1/nodes/"+id)).body(inventory.snapshot().nodes().stream().filter(n->n.nodeId().equals(id)).findFirst().orElseThrow());
    }
}
