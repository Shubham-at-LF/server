import json
import random
from datetime import timedelta

def generate_json_points(num_points, output_file):
    data = []
    current_time = timedelta(hours=0, minutes=0, seconds=0)

    for i in range(num_points):
        # Generate random values for the fields
        tool_utilized = random.randint(0, 100)
        upper_limit = tool_utilized + random.randint(5, 15)
        lower_limit = max(0, tool_utilized - random.randint(5, 15))
        baseline = random.randint(lower_limit, upper_limit)

        # Ensure only one of the boolean fields is true
        fields = ["partMadeForBaseline", "nsequenceChangedForBaseline", "partMadeForActual", "nsequenceChangedForActual"]
        selected_field = random.choice(fields)
        boolean_values = {field: field == selected_field for field in fields}

        # Add the data point to the list
        data.append({
            "elapsedTime": str(current_time),
            "toolUtilized": tool_utilized,
            "upperLimit": upper_limit,
            "lowerLimit": lower_limit,
            "baseline": baseline,
            **boolean_values
        })

        # Increment time by 5 minutes for each point
        current_time += timedelta(minutes=5)

    # Write data to a JSON file
    with open(output_file, "w") as f:
        json.dump(data, f, indent=2)

# Generate 5000 points and save to a file
print("hey");
generate_json_points(num_points=5000, output_file="points_data.json")