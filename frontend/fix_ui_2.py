import re

file_path = r'c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken JS by replacing the broken function
broken_pattern = r'const makeBezier = \(data\).*?\(\)'
fixed_repl = """const makeBezier = (data) => {
                        if (!data || data.length === 0) return "";
                        let d = `M 0,${mapY(data[0].churned)}`;
                        for (let i = 1; i < data.length; i++) {
                          const prevX = (i - 1) * 200;
                          const prevY = mapY(data[i - 1].churned);
                          const currX = i * 200;
                          const currY = mapY(data[i].churned);
                          const cpX = (prevX + currX) / 2;
                          d += ` C ${cpX},${prevY} ${cpX},${currY} ${currX},${currY}`;
                        }
                        return d;
                      };
                      
                      const makeBezierReverse = (data) => {
                        if (!data || data.length === 0) return "";
                        let d = `L ${(data.length - 1) * 200},${mapY(data[data.length - 1].churned)}`;
                        for (let i = data.length - 2; i >= 0; i--) {
                          const prevX = (i + 1) * 200;
                          const prevY = mapY(data[i + 1].churned);
                          const currX = i * 200;
                          const currY = mapY(data[i].churned);
                          const cpX = (prevX + currX) / 2;
                          d += ` C ${cpX},${prevY} ${cpX},${currY} ${currX},${currY}`;
                        }
                        return d;
                      };
                      
                      const pathWithout = makeBezier(forecastData.without_intervention);
                      const pathWith = makeBezier(forecastData.with_intervention);
                      const areaPath = `${pathWithout} ${makeBezierReverse(forecastData.with_intervention)} Z`;

                      return (
                        <svg viewBox="-20 0 640 220" className="w-full h-full font-mono text-xs">
                          <line x1="0" y1="180" x2="600" y2="180" stroke="var(--border-color)" strokeWidth="1" />
                          <line x1="0" y1="110" x2="600" y2="110" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
                          <line x1="0" y1="40" x2="600" y2="40" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
  
                          <text x="0" y="200" fill="var(--text-secondary)" textAnchor="middle">Today</text>
                          <text x="200" y="200" fill="var(--text-secondary)" textAnchor="middle">30 Days</text>
                          <text x="400" y="200" fill="var(--text-secondary)" textAnchor="middle">60 Days</text>
                          <text x="600" y="200" fill="var(--text-secondary)" textAnchor="middle">90 Days</text>
  
                          {showWithoutIntervention && showWithIntervention && (
                            <path d={areaPath} fill="rgba(245, 158, 11, 0.15)" stroke="none" />
                          )}
  
                          {showWithIntervention && (
                            <>
                              <path d={pathWith} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              {forecastData.with_intervention.map((d, i) => (
                                <g key={`with-${i}`}>
                                  <circle cx={i*200} cy={mapY(d.churned)} r="4" fill="#22c55e" />
                                  <text x={i*200} y={mapY(d.churned) + 15} fill="#22c55e" textAnchor="middle">{d.churned}</text>
                                </g>
                              ))}
                            </>
                          )}
  
                          {showWithoutIntervention && (
                            <>
                              <path d={pathWithout} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              {forecastData.without_intervention.map((d, i) => (
                                <g key={`wo-${i}`}>
                                  <circle cx={i*200} cy={mapY(d.churned)} r="4" fill="#ef4444" />
                                  <text x={i*200} y={mapY(d.churned) - 10} fill="#ef4444" textAnchor="middle">{d.churned}</text>
                                </g>
                              ))}
                            </>
                          )}
                        </svg>
                      );
                    })"""
content = re.sub(broken_pattern, fixed_repl + '()', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
