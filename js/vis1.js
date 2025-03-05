(async function() {
  // 1) Load CSV
  const data = await d3.csv("data/data.csv");

  // 2) Filter & parse
  //    Example: We'll keep only "All-items" with 2002=100,
  //    and only for "Canada" as GEO
  const filteredData = data.filter(d =>
    d["GEO"] === "Canada" &&
    d["Products and product groups"] === "All-items"
  );

  // Convert REF_DATE from "YYYY-MM" into a JS Date
  // and VALUE from string -> number
  const parseDate = d3.timeParse("%Y-%m");

  filteredData.forEach(d => {
    d.date = parseDate(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });

  // Sort by date ascending (just in case)
  filteredData.sort((a, b) => a.date - b.date);

  // 3) Set up chart dimensions
  const margin = { top: 30, right: 30, bottom: 50, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

  // 4) Create SVG
  const svg = d3.select("#vis1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // 5) Define scales
  const x = d3.scaleTime()
    .domain(d3.extent(filteredData, d => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(filteredData, d => d.value)])
    .range([height, 0])
    .nice();

  // 6) Draw axes
  const xAxis = d3.axisBottom(x).ticks(10);
  const yAxis = d3.axisLeft(y);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

  svg.append("g")
    .call(yAxis);

  // 7) Draw line
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

  svg.append("path")
    .datum(filteredData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  // 8) Optional: Add circles or tooltips
  // ...
})();
