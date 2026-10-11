package vn.smartfarm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Day 1 bootstrap only. REST, database and authentication arrive in Day 3. */
@SpringBootApplication
public class SmartFarmApplication {
    public static void main(String[] args) {
        SpringApplication.run(SmartFarmApplication.class, args);
    }
}
