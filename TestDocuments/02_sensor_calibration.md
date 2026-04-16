# Sensor calibration — Aurora Field Lab

## Scope

This note describes how we calibrate **Model S-440** particulate sensors used in the perimeter array.

## Procedure (short)

1. Warm the sensor head for **15 minutes** at room temperature (or inside Building A’s dry bench).
2. Apply the **zero-air** canister (part **ZA-12**) for **90 seconds**.
3. Run the calibration wizard in **LabOS v3.6** and select profile **“Cold-dust / high static”**.
4. Record the resulting **offset vector** in the maintenance log. Expected magnitude is **< 0.08** after a good zero.

## Warnings

- Do not open the optical cavity outdoors when wind gusts exceed **40 km/h**.
- If the sensor reports **error code E-77**, replace the desiccant pack **DP-5** before recalibrating.

## Cross-reference

The perimeter array’s maintenance window is documented in `03_maintenance_schedule.json` under the key `perimeter_array`.
