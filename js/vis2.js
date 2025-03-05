(async function() {
  // 1) Load CSV
  const data = await d3.csv("data/data.csv");

  // 2) Parse & Filter
  const parseDate = d3.timeParse("%Y-%m");
  data.forEach(d => {
    d.date = parseDate(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });

  // Filter for Canada, 2024 only
  const filteredData = data.filter(d =>
    d["GEO"] === "Canada" &&
    d.date != null &&
    d.date.getFullYear() === 2024
  );

  // 3) Aggregate by product group (mean of 2024)
  const groupRollup = d3.rollups(
    filteredData,
    v => d3.mean(v, d => d.value),
    d => d["Products and product groups"]
  );
  // Transform into an array of objects
  const barData = groupRollup.map(([product, avgValue]) => ({
    product,
    avgValue
  }));

  // Optionally sort barData by avgValue descending or ascending
  // barData.sort((a,b) => d3.descending(a.avgValue, b.avgValue));

  // 4) Chart dimensions
  const margin = { top: 40, right: 30, bottom: 90, left: 60 },
        width  = 800 - margin.left - margin.right,
        height = 500 - margin.top  - margin.bottom;

  // 5) Create SVG
  const svg = d3.select("#vis2")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom);

  // A group for content
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // 6) Define x & y scales
  //    ----------------------------------
  //    Instead of using d3.scaleBand, we’ll use d3.scaleLinear for horizontal axis
  //    The domain = [0, barData.length], so each category is an integer index
  //    We'll label them with barData[i].product

  // # categories
  const n = barData.length;

  // x = linear scale from [0..n], mapped to [0..width]
  const x = d3.scaleLinear()
    .domain([0, n])           // 0..n
    .range([0, width]);       // pixel range

  // y = linear scale for avgValue
  const y = d3.scaleLinear()
    .domain([0, d3.max(barData, d => d.avgValue)])
    .range([height, 0])
    .nice();

  // 7) Axes
  // We’ll define a bottom axis that shows ticks at integer indices [0..n-1],
  // but each tick's label is barData[i].product
  const xAxis = d3.axisBottom(x)
    // by default, the axis will pick some ticks
    // force integer ticks from 0..(n-1) so that each category is shown
    .tickValues(d3.range(n))
    .tickFormat(i => barData[i].product)  // label with product name
    .tickSizeOuter(0);

  const xAxisG = g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-45) translate(-5,-5)");

  const yAxis = d3.axisLeft(y);
  const yAxisG = g.append("g")
    .attr("class", "y-axis")
    .call(yAxis);

  // 8) Draw bars
  // We'll map each data point to an index i
  // each bar's x position: x(i + somePadding)
  // each bar's width: x(i+1 - somePadding) - x(i + somePadding)
  const barPadding = 0.1; // fraction of each "1" step
  const bars = g.selectAll(".bar")
    .data(barData)
    .join("rect")
    .attr("class", "bar")
    .attr("fill", "steelblue")
    .attr("x", (d, i) => x(i + barPadding))
    .attr("width", (d, i) => x(i+1 - barPadding) - x(i + barPadding))
    .attr("y", d => y(d.avgValue))
    .attr("height", d => height - y(d.avgValue));

  // 9) Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #333")
    .style("padding", "5px")
    .style("display", "none")
    .style("pointer-events", "none");

  bars
    .on("mouseover", (event, d) => {
      tooltip
        .style("display", "inline-block")
        .html(`<strong>${d.product}</strong><br>Avg: ${d.avgValue.toFixed(2)}`);
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY + 10) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("display", "none");
    });

  // 10) Chart title
  g.append("text")
    .attr("x", width/2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Avg CPI by Product Group (Canada, 2024) - Zoom Enabled");

  // 11) Define a 2D zoom: user can zoom and pan both horizontally and vertically
  //    up to 5x in each direction
  const zoom = d3.zoom()
    .scaleExtent([1, 5])                      // how far you can zoom in/out
    .translateExtent([[0, 0], [width, height]])// limit panning so you don’t drag bars completely out of view
    .on("zoom", zoomed);

  function zoomed(event) {
    // event.transform.rescaleX(x) => new x scale
    // event.transform.rescaleY(y) => new y scale
    const newX = event.transform.rescaleX(x);
    const newY = event.transform.rescaleY(y);

    // re-draw X axis
    // we want integer ticks from 0..n-1, but scaled by newX
    // The domain might be [someMin..someMax], so we find the integer range inside that
    // We'll clamp them to [0..n-1]
    const minI = Math.floor(Math.max(0, newX.invert(0)));
    const maxI = Math.ceil(Math.min(n, newX.invert(width)));

    // build an array of integer indices within the visible range
    const tickIndices = d3.range(minI, maxI);
    const xAxisZoomed = d3.axisBottom(newX)
      .tickValues(tickIndices)
      .tickFormat(i => barData[i]?.product ?? "");

    g.select(".x-axis")
      .call(xAxisZoomed)
      .selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-45) translate(-5,-5)");

    // re-draw Y axis
    g.select(".y-axis")
      .call(d3.axisLeft(newY));

    // re-position bars
    bars
      .attr("x", (d, i) => newX(i + barPadding))
      .attr("width", (d, i) => newX(i+1 - barPadding) - newX(i + barPadding))
      .attr("y", d => newY(d.avgValue))
      .attr("height", d => height - newY(d.avgValue));
  }

  // 12) Attach zoom to the entire svg
  svg.call(zoom);

})();