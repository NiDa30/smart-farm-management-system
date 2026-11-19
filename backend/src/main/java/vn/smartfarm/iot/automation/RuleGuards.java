package vn.smartfarm.iot.automation;

/**
 * Extra conditions that must all hold before the watering rule may dispatch ON. Pure logic
 * (no Spring, no database) so the decision is the same in the live rule and the simulator.
 * Every guard is optional; a null field means "not checked".
 */
public final class RuleGuards {
    private RuleGuards() {}

    public record Guards(Double minAirTemperature, Double maxAirTemperature, Double maxAirHumidity,
        String waterNode, String waterChannel, Integer maxRunsPerDay, long revision) {
        public boolean waterRequired() { return waterNode != null; }
        public Guards withRevision(long next) {
            return new Guards(minAirTemperature, maxAirTemperature, maxAirHumidity, waterNode, waterChannel, maxRunsPerDay, next);
        }
    }

    public static final Guards NONE = new Guards(null, null, null, null, null, null, 1);

    public static final String DAILY_LIMIT = "DAILY_LIMIT_REACHED";
    public static final String TEMPERATURE = "AIR_TEMPERATURE_OUT_OF_RANGE";
    public static final String HUMIDITY = "AIR_HUMIDITY_HIGH";
    public static final String WATER = "WATER_NOT_CONFIRMED";

    /** Throws IllegalArgumentException naming the first invalid field. */
    public static Guards validate(Guards g) {
        if (g == null) throw new IllegalArgumentException("Guards required");
        if (g.revision() < 1) throw new IllegalArgumentException("revision");
        check(g.minAirTemperature(), -40, 80, "minAirTemperature");
        check(g.maxAirTemperature(), -40, 80, "maxAirTemperature");
        if (g.minAirTemperature() != null && g.maxAirTemperature() != null && g.minAirTemperature() >= g.maxAirTemperature())
            throw new IllegalArgumentException("minAirTemperature must be below maxAirTemperature");
        check(g.maxAirHumidity(), 1, 100, "maxAirHumidity");
        if ((g.waterNode() == null) != (g.waterChannel() == null))
            throw new IllegalArgumentException("waterNode and waterChannel are set together");
        if (g.waterNode() != null && (!code(g.waterNode()) || !code(g.waterChannel())))
            throw new IllegalArgumentException("water channel code");
        if (g.maxRunsPerDay() != null && (g.maxRunsPerDay() < 1 || g.maxRunsPerDay() > 200))
            throw new IllegalArgumentException("maxRunsPerDay must be 1..200");
        return g;
    }

    private static void check(Double value, double min, double max, String field) {
        if (value != null && (!Double.isFinite(value) || value < min || value > max))
            throw new IllegalArgumentException(field + " must be " + min + ".." + max);
    }

    private static boolean code(String value) { return value.matches("[A-Z][A-Z0-9_-]{1,31}"); }

    /**
     * Returns null when ON may be dispatched, otherwise the first blocking reason.
     * waterPresent is null when no fresh valid reading exists: unknown never counts as water.
     */
    public static String block(Guards g, double temperature, double humidity, Boolean waterPresent, int runsToday) {
        if (g.maxRunsPerDay() != null && runsToday >= g.maxRunsPerDay()) return DAILY_LIMIT;
        if (g.minAirTemperature() != null && temperature < g.minAirTemperature()) return TEMPERATURE;
        if (g.maxAirTemperature() != null && temperature > g.maxAirTemperature()) return TEMPERATURE;
        if (g.maxAirHumidity() != null && humidity >= g.maxAirHumidity()) return HUMIDITY;
        if (g.waterRequired() && !Boolean.TRUE.equals(waterPresent)) return WATER;
        return null;
    }
}
