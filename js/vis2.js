(async function() {
    // 1) Load CSV
    const data = await d3.csv("data/data.csv");
  
    // 2) Parse & Filter
    //    Parse REF_DATE from "YYYY-MM" into a JS Date
    const parseDate = d3.timeParse("%Y-%m");
  
    data.forEach(d => {
      d.date = parseDate(d["REF_DATE"]);
      d.value = +d["VALUE"]; // convert string to number
    });
  
    // We'll focus on Canada data for 2024 only (Jan-Dec).
    // Adjust if you want a different year or a different date range.
    const filteredData = data.filter(d =>
      d["GEO"] === "Canada" &&
      d.date !== null &&            // ensure parseDate worked
      d.date.getFullYear() === 2024 // filter the year 2024
    );
  
    // 3) Aggregate by product group
    //    We'll compute the mean VALUE across 2024 for each product group.
    //    d3.rollups returns an array of [key, aggregatedValue].
    const groupRollup = d3.rollups(
      filteredData,
      v => d3.mean(v, d => d.value),
      d => d["Products and product groups"]
    );
  
    // Transform the rollup array into an array of objects for easy D3 usage
    // e.g. [{ product: "All-items", avgValue: 112.3 }, ...]
    const barData = groupRollup.map(([product, avgValue]) => ({
      product,
      avgValue
    }));
  
    // 4) Chart dimensions
    const margin = { top: 30, right: 30, bottom: 90, left: 60 },
          width  = 800 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;
  
    // 5) Create SVG
    const svg = d3.select("#vis2")
      .append("svg")
      .attr("width",  width  + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // 6) Define scales
    //    X scale = product group categories
    const x = d3.scaleBand()
      .domain(barData.map(d => d.product))
      .range([0, width])
      .padding(0.2);
  
    //    Y scale = average value
    const y = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.avgValue)])
      .range([height, 0])
      .nice();
  
    // 7) Axes
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      // rotate product group labels if they're long
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-45) translate(-5,-5)");
  
    svg.append("g")
      .call(d3.axisLeft(y));
  
    // 8) Draw bars
    svg.selectAll(".bar")
      .data(barData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.product))
      .attr("y", d => y(d.avgValue))
      .attr("width",  x.bandwidth())
      .attr("height", d => height - y(d.avgValue));
  
    // Optional: Add chart title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10) // above the top axis
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text("Average CPI Value by Product Group (Canada, 2024)");
  
  })();
  