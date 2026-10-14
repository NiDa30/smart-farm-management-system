package vn.smartfarm.iot.nodes;

import org.springframework.stereotype.Service;
import vn.smartfarm.iot.telemetry.TelemetryStorage;

@Service
public class TelemetryRouter {
    private final TelemetryStorage legacy;private final WaterTelemetry water;private final NodeInventory nodes;
    public TelemetryRouter(TelemetryStorage legacy,WaterTelemetry water,NodeInventory nodes){this.legacy=legacy;this.water=water;this.nodes=nodes;}
    public boolean store(String topic,byte[] bytes){
        var version=water.object(bytes).path("schemaVersion");
        if(!version.isIntegralNumber()||!version.canConvertToInt())throw new IllegalArgumentException("Invalid schema version");
        return switch(version.intValue()) {
            case 1 -> legacy.save(legacy.decodeRegistered(topic,bytes));
            case 2 -> nodes.storeChannels(topic,water.parseChannels(bytes));
            default -> throw new IllegalArgumentException("Unsupported schema version");
        };
    }
}
