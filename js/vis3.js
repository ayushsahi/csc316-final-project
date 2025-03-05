(async function() {
    // 1) Load CSV
    const data = await d3.csv("data/data.csv");
  
    // 2) Parse date & numeric value
    const parseDate = d3.timeParse("%Y-%m");
    data.forEach(d => {
      d.date = parseDate(d["REF_DATE"]);
      d.value = +d["VALUE"];
    });
  
    // Filter to Canada only, ignoring rows where date parsing failed
    const filtered = data.filter(d => d["GEO"] === "Canada" && d.date);
  
    // 3) Group data by product group
    //    d3.groups(...) -> returns array of [groupName, dataArray]
    //    e.g. [
    //      ["All-items", [ {...}, {...}, ... ]],
    //      ["Goods and services", [ {...}, ... ]],
    //      ...
    //    ]
    const nested = d3.groups(filtered, d => d["Products and product groups"]);
  
    // 4) Sort each sub-array by date so lines appear in chronological order
    nested.forEach(group => {
      group[1].sort((a, b) => a.date - b.date);
    });
  
    // 5) Chart dimensions
    const margin = { top: 30, right: 120, bottom: 50, left: 60 },
          width  = 800 - margin.left - margin.right,
          height = 500 - margin.top  - margin.bottom;
  
    // Create SVG
    const svg = d3.select("#vis3")
      .append("svg")
      .attr("width",  width  + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // 6) Define scales
    //    X = date range
    const allDates  = nested.flatMap(([, vals]) => vals).map(d => d.date);
    const x = d3.scaleTime()
      .domain(d3.extent(allDates))
      .range([0, width]);
  
    //    Y = max value among all product groups
    const allValues = nested.flatMap(([, vals]) => vals).map(d => d.value);
    const y = d3.scaleLinear()
      .domain([0, d3.max(allValues)])
      .range([height, 0])
      .nice();
  
    // 7) Draw axes
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(10));
  
    svg.append("g")
      .call(d3.axisLeft(y));
  
    // 8) Line generator
    const lineGen = d3.line()
      .defined(d => !isNaN(d.value)) // skip missing/NaN
      .x(d => x(d.date))
      .y(d => y(d.value));
  
    // 9) Color scale (one color per product group)
    //    If you have many groups, you might want a bigger palette or limit groups
    const color = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(nested.map(d => d[0]));
  
    // 10) Draw a path for each product group
    svg.selectAll(".line-group")
      .data(nested)
      .join("path")
      .attr("class", "line-group")
      .attr("fill", "none")
      .attr("stroke", d => color(d[0]))
      .attr("stroke-width", 1.5)
      .attr("d", d => lineGen(d[1]));
  
    // 11) (Optional) Add a legend on the right side
    //      We can place each legend item slightly below the previous
    const legend = svg.selectAll(".legend")
      .data(nested.map(d => d[0])) // the group names
      .join("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${width + 10}, ${i * 20})`);
  
    // draw color box
    legend.append("rect")
      .attr("x", 0)
      .attr("y", -8)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", d => color(d));
  
    // draw label text
    legend.append("text")
      .attr("x", 15)
      .attr("y", 0)
      .attr("dy", ".35em")
      .text(d => d);
  
    // 12) Optional title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text("CPI Over Time by Product Group (Canada)");
  
  })();
  