package vn.smartfarm.iot.nodes;
import java.time.Instant;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/nodes/{nodeId}/channels/{channelId}/history")
public class WaterHistoryController {
    private final WaterHistory history;
    public WaterHistoryController(WaterHistory history){this.history=history;}
    @GetMapping public WaterHistory.Page list(@PathVariable String nodeId,@PathVariable String channelId,
        @RequestParam(required=false) Instant from,@RequestParam(required=false) Instant to,
        @RequestParam(required=false) String dataSource,@RequestParam(required=false) String quality,
        @RequestParam(defaultValue="100") int limit,@RequestParam(required=false) String cursor){
        return history.list(nodeId,channelId,from,to,dataSource,quality,limit,cursor);
    }
}
