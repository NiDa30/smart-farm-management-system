package vn.smartfarm.iot.devmgmt;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/devices/ENV01")
public class DeviceManagementController {
    private final DeviceManagementService service;
    public DeviceManagementController(DeviceManagementService service) { this.service = service; }

    @GetMapping("/config") public DeviceManagementService.ConfigView config() { return service.config(); }
    @PostMapping("/config") @ResponseStatus(HttpStatus.ACCEPTED)
    public DeviceManagementService.ConfigRequest request(@RequestBody DeviceManagementService.Settings settings) { return service.requestConfig(settings); }

    @GetMapping("/ota") public DeviceManagementService.OtaView ota() { return service.ota(); }
    @PostMapping("/ota/releases") @ResponseStatus(HttpStatus.CREATED)
    public DeviceManagementService.Release register(@RequestBody DeviceManagementService.ReleaseRequest release) { return service.register(release); }
    @PostMapping("/ota/jobs") @ResponseStatus(HttpStatus.ACCEPTED)
    public DeviceManagementService.OtaJob start(@RequestBody DeviceManagementService.StartRequest request) { return service.start(request); }
}
