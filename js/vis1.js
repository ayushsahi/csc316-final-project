(async function() {
  // 1) Load CSV
  const data = await d3.csv("data/food_cpi_data.csv");

  // 2) Create UI controls for filtering
  const controlPanel = d3.select("#vis1")
    .append("div")
    .attr("class", "control-panel")
    .style("margin-bottom", "20px");
  
  // Add a title for the filter section
  controlPanel.append("div")
    .attr("class", "filter-title")
    .text("Calendar Heatmap Settings")
    .style("font-weight", "bold")
    .style("margin-bottom", "10px");
  
  // Add product selector
  const productSelector = controlPanel.append("div")
    .style("margin-bottom", "10px");
  
  productSelector.append("label")
    .text("Select Product Group: ")
    .attr("for", "product-select");
  
  // Parse data
  const parseDate = d3.timeParse("%Y-%m-%d");
  data.forEach(d => {
    d.date = parseDate(d["REF_DATE"]) || d3.timeParse("%Y-%m")(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });
  
  // Get unique product groups
  const productGroups = [...new Set(data.map(d => d["Products and product groups"]))].sort();
  
  const productSelect = productSelector.append("select")
    .attr("id", "product-select")
    .style("margin-left", "10px")
    .style("padding", "5px")
    .style("min-width", "200px")
    .on("change", updateVisualization);
  
  productSelect.selectAll("option")
    .data(productGroups)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d)
    .property("selected", d => d === "Food"); // Default to "Food"
  
  // Add year range selector
  const yearRangeSelector = controlPanel.append("div")
    .style("margin-bottom", "10px");
  
  yearRangeSelector.append("label")
    .text("Year Range: ")
    .attr("for", "year-start");
  
  // Get all years from the data
  const years = [...new Set(data.map(d => d.date.getFullYear()))].sort();
  
  // Create start year dropdown
  const yearStartSelect = yearRangeSelector.append("select")
    .attr("id", "year-start")
    .style("margin", "0 10px")
    .style("padding", "5px")
    .on("change", function() {
      // Ensure end year is not before start year
      const startYear = +this.value;
      const endYear = +yearEndSelect.property("value");
      
      if (endYear < startYear) {
        yearEndSelect.property("value", startYear);
      }
      
      updateVisualization();
    });
  
  yearStartSelect.selectAll("option")
    .data(years)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d)
    .property("selected", d => d === years[years.length - 11]); // Default to 10 years ago
  
  yearRangeSelector.append("span").text("to");
  
  // Create end year dropdown
  const yearEndSelect = yearRangeSelector.append("select")
    .attr("id", "year-end")
    .style("margin-left", "10px")
    .style("padding", "5px")
    .on("change", function() {
      // Ensure start year is not after end year
      const endYear = +this.value;
      const startYear = +yearStartSelect.property("value");
      
      if (startYear > endYear) {
        yearStartSelect.property("value", endYear);
      }
      
      updateVisualization();
    });
  
  yearEndSelect.selectAll("option")
    .data(years)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d)
    .property("selected", d => d === years[years.length - 1]); // Default to latest year
  
  // Add apply button
  controlPanel.append("button")
    .attr("class", "apply-filters-button")
    .text("Apply Settings")
    .style("padding", "5px 10px")
    .on("click", updateVisualization);
  
  // Add scroll instructions
  controlPanel.append("div")
    .attr("class", "scroll-instructions")
    .style("margin-top", "10px")
    .style("font-style", "italic")
    .style("color", "#666")
    .text("← Scroll horizontally to view all years →");
  
  // Create a scrollable container for the calendar visualization
  const scrollContainer = d3.select("#vis1").append("div")
    .attr("class", "scroll-container")
    .style("width", "100%")
    .style("overflow-x", "auto")
    .style("overflow-y", "hidden")
    .style("margin-top", "20px")
    .style("position", "relative")
    .style("padding", "10px 0");
  
  // Create a fixed-size container for all years
  const calendarContainer = scrollContainer.append("div")
    .attr("class", "calendar-container")
    .style("display", "inline-flex")
    .style("flex-wrap", "nowrap");
  
  // Add tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(255, 255, 255, 0.95)")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("padding", "8px")
    .style("box-shadow", "0 0 10px rgba(0,0,0,0.1)")
    .style("pointer-events", "none")
    .style("opacity", 0);
  
  // Initialize visualization
  updateVisualization();
  
  // Function to update visualization based on selected product and years
  function updateVisualization() {
    // Clear previous content
    calendarContainer.html("");
    
    // Get selected product
    const selectedProduct = productSelect.property("value");
    
    // Get selected years range
    const startYear = +yearStartSelect.property("value");
    const endYear = +yearEndSelect.property("value");
    
    // Add title to the container
    scrollContainer.selectAll(".calendar-title").remove();
    scrollContainer.insert("div", ":first-child")
      .attr("class", "calendar-title")
      .style("text-align", "center")
      .style("font-weight", "bold")
      .style("font-size", "16px")
      .style("margin-bottom", "10px")
      .text(`Monthly CPI Changes: ${selectedProduct} (${startYear}-${endYear})`);
    
    // Filter data for selected product (Canada only) and years
    const filteredData = data.filter(d => 
      d["GEO"] === "Canada" && 
      d["Products and product groups"] === selectedProduct &&
      d.date.getFullYear() >= startYear &&
      d.date.getFullYear() <= endYear
    );
    
    // Process data to calculate month-to-month changes
    const yearData = {};
    
    // First, collect all data by year and month
    filteredData.forEach(d => {
      const year = d.date.getFullYear();
      const month = d.date.getMonth();
      
      if (!yearData[year]) {
        yearData[year] = Array(12).fill(null);
      }
      
      yearData[year][month] = {
        date: d.date,
        value: d.value,
        change: null // Will calculate this next
      };
    });
    
    // Then calculate the changes
    for (let year = startYear; year <= endYear; year++) {
      if (!yearData[year]) continue;
      
      for (let month = 0; month < 12; month++) {
        if (!yearData[year][month]) continue;
        
        // Calculate change from previous month
        if (month > 0 && yearData[year][month-1]) {
          // Compare with previous month of same year
          yearData[year][month].change = ((yearData[year][month].value / yearData[year][month-1].value) - 1) * 100;
        } else if (month === 0 && year > startYear && yearData[year-1] && yearData[year-1][11]) {
          // Compare January with previous December
          yearData[year][month].change = ((yearData[year][month].value / yearData[year-1][11].value) - 1) * 100;
        }
      }
    }
    
    // Find max change for color scale
    let maxChange = 0;
    Object.values(yearData).forEach(months => {
      months.forEach(month => {
        if (month && month.change !== null) {
          maxChange = Math.max(maxChange, Math.abs(month.change));
        }
      });
    });
    
    // Add some buffer to max change for better visualization
    maxChange = Math.ceil(maxChange * 1.1);
    
    // Create color scale (red for increases, blue for decreases)
    const colorScale = d3.scaleSequential(d3.interpolateRdBu)
      .domain([maxChange, -maxChange]);
    
    // Create a year calendar for each year in the range
    for (let year = startYear; year <= endYear; year++) {
      // Create a container for this year
      const yearContainer = calendarContainer.append("div")
        .attr("class", "year-container")
        .style("margin-right", "20px")
        .style("display", "inline-block")
        .style("vertical-align", "top")
        .style("min-width", "350px");
      
      // Add year title
      yearContainer.append("div")
        .attr("class", "year-title")
        .style("text-align", "center")
        .style("font-weight", "bold")
        .style("margin-bottom", "10px")
        .text(year);
      
      // Create the calendar grid
      const calendarGrid = yearContainer.append("div")
        .attr("class", "calendar-grid")
        .style("display", "grid")
        .style("grid-template-columns", "repeat(12, 1fr)")
        .style("gap", "5px");
      
      // Add month labels
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      monthLabels.forEach(month => {
        calendarGrid.append("div")
          .attr("class", "month-label")
          .style("text-align", "center")
          .style("font-size", "12px")
          .text(month);
      });
      
      // Add cells for each month
      const monthsData = yearData[year] || Array(12).fill(null);
      
      monthsData.forEach((month, i) => {
        const cell = calendarGrid.append("div")
          .attr("class", "month-cell")
          .style("width", "25px")
          .style("height", "25px")
          .style("border-radius", "4px")
          .style("display", "flex")
          .style("align-items", "center")
          .style("justify-content", "center")
          .style("cursor", "pointer")
          .style("font-size", "10px")
          .style("font-weight", "bold")
          .style("color", "#000")
          .style("margin", "auto")
          .style("background-color", month && month.change !== null ? colorScale(month.change) : "#eee")
          .style("border", "1px solid #ccc")
          .style("transition", "all 0.2s ease");
        
        // Add text for the change value
        if (month && month.change !== null) {
          const formattedChange = month.change.toFixed(1);
          cell.text(formattedChange > 0 ? `+${formattedChange}` : formattedChange);
        } else {
          cell.text("n/a")
            .style("color", "#999")
            .style("font-weight", "normal");
        }
        
        // Add hover effects
        cell.on("mouseover", function() {
          d3.select(this)
            .style("border", "2px solid #333")
            .style("transform", "scale(1.1)");
          
          if (month) {
            const formatDate = d3.timeFormat("%B %Y");
            const formatValue = d3.format("+.2f");
            
            tooltip
              .style("opacity", 1)
              .html(`
                <strong>${month.date ? formatDate(month.date) : monthLabels[i] + ' ' + year}</strong><br>
                ${selectedProduct}<br>
                ${month.change !== null 
                  ? `Change: ${formatValue(month.change)}%` 
                  : "No data available"}
              `);
          }
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
          d3.select(this)
            .style("border", "1px solid #ccc")
            .style("transform", "scale(1)");
          
          tooltip.style("opacity", 0);
        });
      });
    }
    
    // Add legend
    scrollContainer.selectAll(".legend-container").remove();
    
    const legendContainer = scrollContainer.append("div")
      .attr("class", "legend-container")
      .style("margin-top", "20px")
      .style("text-align", "center");
    
    legendContainer.append("div")
      .attr("class", "legend-title")
      .style("font-weight", "bold")
      .style("margin-bottom", "5px")
      .text("Monthly Change (%)");
    
    const legendScale = document.createElement("div");
    legendScale.className = "legend-scale";
    legendScale.style.width = "250px";
    legendScale.style.height = "20px";
    legendScale.style.margin = "0 auto";
    legendScale.style.background = "linear-gradient(to right, #ef8a62, #f7f7f7, #67a9cf)";
    legendScale.style.borderRadius = "4px";
    legendScale.style.position = "relative";
    
    legendContainer.node().appendChild(legendScale);
    
    const legendValues = document.createElement("div");
    legendValues.className = "legend-values";
    legendValues.style.display = "flex";
    legendValues.style.justifyContent = "space-between";
    legendValues.style.marginTop = "5px";
    
    const values = [
      { value: `+${maxChange.toFixed(1)}%`, position: "left" },
      { value: "0%", position: "center" },
      { value: `-${maxChange.toFixed(1)}%`, position: "right" }
    ];
    
    values.forEach(item => {
      const valueSpan = document.createElement("span");
      valueSpan.textContent = item.value;
      valueSpan.style.fontSize = "12px";
      valueSpan.style.fontWeight = "bold";
      valueSpan.style.textAlign = item.position;
      legendValues.appendChild(valueSpan);
    });
    
    legendContainer.node().appendChild(legendValues);
  }
})();