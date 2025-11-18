# EVGraph - Expected Value Visualization Tool

A sophisticated visualization tool for analyzing betting odds opportunities with positive Expected Value (EV+). The tool provides gradient-based visualization of profit opportunities, lifetime tracking, and bet acceptance analysis.

## Features

### 1. Gradient Visualization
- **EV+ Detection**: Automatically identifies and visualizes positions where soft bookmaker odds exceed fair odds
- **Layered Gradient**: Creates visual depth through 1% EV layers with progressive transparency
- **Dynamic Scaling**: Gradients adapt to each time segment's individual EV value
- **10% EV Threshold**: Special handling for high-value opportunities (≥10% EV)

### 2. Comprehensive Metrics
- **Soft Odds**: Bookmaker's offered odds (green line)
- **Fair Odds**: Calculated fair market odds (red line)
- **EV Percentage**: Expected value as a percentage
- **Lifetime**: Duration until next odds change

### 3. Bet Tracking
- **Acceptance Visualization**: Color-coded "barrels" showing bet acceptance attempts
  - Blue: Accepted bets
  - Yellow: Rejected bets
- **Acceptance Time**: Visual representation of processing duration
- **Detailed Annotations**: Comprehensive information for each betting attempt

### 4. Advanced Features
- **Data Gaps Handling**: Graceful handling of missing data with NaN values
- **Multi-level Annotations**: Automatic positioning to prevent label overlap
- **EV Grid Lines**: Horizontal lines showing EV percentage levels
- **Time-based Navigation**: Clear timestamp markers for all data points

## Installation

### Requirements
```bash
pip install matplotlib pandas numpy
```

### Clone Repository
```bash
git clone git@github.com:vbalance/evgraph.git
cd evgraph
```

## Usage

### Basic Usage
```bash
python main.py
```

### Data Format

#### Odds Data (CSV)
```csv
Time,FairOdds,SoftOdds
21:59:55,1.70,1.90
22:01:53,1.72,2.00
22:03:51,1.85,2.00
```

#### Bets Data (CSV)
```csv
Timestamp,FairOdds,SoftOdds,EV,AcceptanceTime,Status
22:01:55,1.72,2.00,16.3,20.0,Accepted
22:15:38,2.82,3.00,6.4,25.0,Rejected
```

## Technical Specifications

### EV Calculation
```
EV = (1 / Fair_Odds) × Soft_Odds - 1
```

### Gradient Algorithm
1. **Layered Approach**: Each 1% EV creates a separate visual layer
2. **Alpha Progression**: `alpha = 0.1 + (ev_threshold × 7)` for EV ≤ 10%
3. **Maximum Density**: Alpha capped at 0.80 for EV > 10%
4. **Boundary Clipping**: All layers clipped to Soft Odds upper limit

### Visualization Layers (zorder)
- Grid lines: 1
- Gradient fill: 2
- Fair Odds line: 3
- Soft Odds line: 4
- Data points: 5
- Bet barrels: 6
- Annotations: 10-11

## Configuration

### Graph Styling
- Theme: Dark background
- Figure size: 14×8
- Time format: HH:MM:SS
- Grid: Dashed, 0.5 width, 20% opacity

### Colors
- Fair Odds: `#ff3333` (Red)
- Soft Odds: `#00ff00` (Green)
- EV+ Gradient: `#00ff00` (Green with varying alpha)
- Accepted Bets: `#00BFFF` (Deep Sky Blue)
- Rejected Bets: `#FFD700` (Gold)

## Project Structure
```
EVGraph/
├── INPUT/
│   ├── odds_data.csv    # Odds history data
│   └── bets_data.csv    # Bet attempts data
├── main.py              # Main visualization script
├── README.md            # This file
├── .gitignore           # Git ignore rules
└── requirements.txt     # Python dependencies
```

## Examples

### Gradient Behavior
- **EV = 2.4%**: 2 gradient layers (1%, 2%)
- **EV = 8.1%**: 8 gradient layers (1%-8%)
- **EV = 11.8%**: 11 gradient layers (1%-10% progressive, 11% at max opacity)
- **EV = 16.3%**: 16 gradient layers (1%-10% progressive, 11%-16% at max opacity)

### Bet Acceptance Flow
1. Bet attempt detected at timestamp
2. Barrel drawn at Soft Odds level
3. Length represents acceptance time
4. Vertical markers show start/end
5. Annotation displays result and metrics

## Contributing

This is a specialized tool for value betting analysis. Contributions welcome for:
- Additional visualization modes
- Enhanced data import/export
- Real-time data integration
- Statistical analysis features

## License

MIT License - Feel free to use and modify for your betting analysis needs.

## Author

Valerii Volkov

## Generated With

🤖 Generated with [Claude Code](https://claude.com/claude-code)
