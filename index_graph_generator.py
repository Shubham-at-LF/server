import json

def generate_json_points(num_points, output_file):
    data = []
    tool_utilized_start = 30  # Starting value for tool utilized
    upper_limit_start = 60
    lower_limit_start = 5
    baseline_start = 15
    increment = 2  # Linear increment for values

    nsequence_val = 10  # Initial sequence value
    part_made = 1  # Initial part made value

    for i in range(num_points):
        # Compute linearly increasing values
        tool_utilized = tool_utilized_start + (i * increment)
        upper_limit = upper_limit_start + (i * increment)
        lower_limit = max(0, lower_limit_start + (i * increment))
        baseline = baseline_start + (i * increment)

        # Ensure only one of the boolean fields is true
        fields = ["part_made_for_baseline", "nsequence_changed_for_baseline", "part_made_for_actual", "nsequence_changed_for_actual"]
        selected_field = fields[i % len(fields)]  # Rotate through fields
        boolean_values = {field: field == selected_field for field in fields}

        # Increment nsequence_val only when nsequence_changed is True
        if boolean_values["nsequence_changed_for_baseline"] or boolean_values["nsequence_changed_for_actual"]:
            nsequence_val += 10
        
        # Increment part_made only when part_made_for_* is True
        if boolean_values["part_made_for_baseline"] or boolean_values["part_made_for_actual"]:
            part_made += 1

        # Add the data point to the list
        data.append({
            "index": i,
            "tool_utilized": tool_utilized,
            "upper_limit": upper_limit,
            "lower_limit": lower_limit,
            "baseline": baseline,
            "nsequence_val_for_actual": nsequence_val,
            "nsequence_val_for_baseline": nsequence_val,
            "part_made": part_made,
            "part_count": "36/3",
            "start_time" : "22 March 2024 at 12:11:12 AM (ET)",
            "end_time": "22 March 2024 at 12:20:15 AM (ET)",
            "control_record": "CR 5",
            **boolean_values
        })

    # Write data to a JSON file
    with open(output_file, "w") as f:
        json.dump(data, f, indent=2)

# Generate 100 points and save to a file
generate_json_points(num_points=25, output_file="index_points_data.json")