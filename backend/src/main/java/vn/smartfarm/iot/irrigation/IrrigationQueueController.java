package vn.smartfarm.iot.irrigation;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.WaterTelemetry;
@RestController
@RequestMapping("/api/v1/irrigation-queue")
public class IrrigationQueueController {
 private final IrrigationQueue queue;private final WaterTelemetry json;
 public IrrigationQueueController(IrrigationQueue queue,WaterTelemetry json){this.queue=queue;this.json=json;}
 @GetMapping public IrrigationQueue.Snapshot snapshot(){return queue.snapshot();}
 @GetMapping("/requests/{id}") public IrrigationQueue.Item lookup(@PathVariable UUID id){return queue.lookup(id);}
 @PostMapping("/requests") @ResponseStatus(HttpStatus.CREATED)
 public IrrigationQueue.Item enqueue(@RequestBody byte[] bytes){try{return queue.enqueue(json.object(bytes));}catch(IllegalArgumentException|java.time.DateTimeException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid queue request");}}
 @PostMapping("/requests/{id}/{operation}")
 public IrrigationQueue.Item act(@PathVariable UUID id,@PathVariable String operation,@RequestBody byte[] bytes){try{
  var input=json.object(bytes);WaterTelemetry.fields(input,Set.of("revision"));long revision=IrrigationQueue.integer(input,"revision",9007199254740991L);
  return switch(operation){case "rehearse"->queue.rehearse(id,revision);case "cancel"->queue.cancel(id,revision);default->throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Unknown queue operation");};
 }catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid queue operation");}}
}
