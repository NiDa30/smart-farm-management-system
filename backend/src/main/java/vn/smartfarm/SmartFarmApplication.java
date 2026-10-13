package vn.smartfarm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Local MVP telemetry ingestion and read API; bind only to loopback. */
@SpringBootApplication
public class SmartFarmApplication {
    public static void main(String[] args) {
        SpringApplication.run(SmartFarmApplication.class, args);
    }
}
