package vn.smartfarm.iot.irrigation;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/irrigation-circuits")
public class CircuitMonitorPackageController {
    private final CircuitMonitorPackage packages;
    public CircuitMonitorPackageController(CircuitMonitorPackage packages){this.packages=packages;}
    @GetMapping(value="/{id}/monitor-package",produces="application/zip")
    public ResponseEntity<byte[]> download(@PathVariable String id,@RequestParam int expectedRevision,
        @RequestParam int expectedZoneRevision,@RequestParam String accountId){
        var p=packages.export(id,expectedRevision,expectedZoneRevision,accountId);var c=p.config();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/zip"))
            .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff")
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(p.filename()).build().toString())
            .header("X-Smartfarm-Package","IRRIGATION_MONITOR_V1").header("X-Smartfarm-Circuit",c.circuitId())
            .header("X-Smartfarm-Circuit-Revision",Integer.toString(c.revision()))
            .header("X-Smartfarm-Zone-Revision",Integer.toString(c.zoneRevision()))
            .header("X-Smartfarm-Controller",c.controllerId()).header("X-Smartfarm-Valve",c.valveId()).body(p.bytes());
    }
}
