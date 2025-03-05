(async function() {
  // 1) Load CSV
  const data = await d3.csv("data/data.csv");

  // 2) Filter & parse
  const filteredData = data.filter(d =>
    d["GEO"] === "Canada" &&
    d["Products and product groups"] === "All-items"
  );

  const parseDate = d3.timeParse("%Y-%m");
  filteredData.forEach(d => {
    d.date = parseDate(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });
  filteredData.sort((a, b) => a.date - b.date);

  // 3) Chart dimensions
  const margin = { top: 30, right: 30, bottom: 50, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

  // 4) Create SVG + container for plotting
  const svg = d3.select("#vis1")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // 5) Scales
  const x = d3.scaleTime()
    .domain(d3.extent(filteredData, d => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(filteredData, d => d.value)])
    .range([height, 0])
    .nice();

  // 6) Axes
  const xAxis = g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(10));

  const yAxis = g.append("g")
    .call(d3.axisLeft(y));

  // 7) Line generator + path
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

  // store reference to path, so we can re-draw it on zoom
  const linePath = g.append("path")
    .datum(filteredData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  // 8) Define the zoom behavior
  //    scaleExtent = how far in/out you can zoom
  //    translateExtent = limit panning outside the chart
  const zoom = d3.zoom()
    .scaleExtent([1, 8])                       // min to max zoom
    .translateExtent([[0, 0], [width, height]]) // cannot pan outside
    .on("zoom", zoomed);

  function zoomed(event) {
    // event.transform gives us scale & translation
    const newX = event.transform.rescaleX(x); // rescale the x axis
    const newY = event.transform.rescaleY(y); // rescale the y axis if desired

    // update axes
    xAxis.call(d3.axisBottom(newX).ticks(10));
    yAxis.call(d3.axisLeft(newY));

    // re-draw line with new scales
    linePath.attr("d", d3.line()
      .x(d => newX(d.date))
      .y(d => newY(d.value))
    );
  }

  // 9) Call zoom on the top-level <svg>
  //    If you want the user to zoom by scrolling or panning anywhere on the chart
  svg.call(zoom)
    .transition()
    .duration(1000)
    .call(zoom.scaleBy, 1);  // optional initial transition

})();
