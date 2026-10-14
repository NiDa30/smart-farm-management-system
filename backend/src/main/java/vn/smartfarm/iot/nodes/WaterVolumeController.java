package vn.smartfarm.iot.nodes;
import java.time.Instant;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/nodes/{nodeId}/channels/{channelId}/water-volume")
public class WaterVolumeController {
 private final WaterVolume volume;
 public WaterVolumeController(WaterVolume volume){this.volume=volume;}
 @GetMapping public WaterVolume.Report estimate(@PathVariable String nodeId,@PathVariable String channelId,
  @RequestParam Instant from,@RequestParam Instant to,@RequestParam String dataSource){return volume.estimate(nodeId,channelId,from,to,dataSource);}
}
