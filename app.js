const margin = { top: 50, right: 50, bottom: 50, left: 50 },
      width = 1500 - margin.left - margin.right,
      height = 700 - margin.top - margin.bottom;

const svg = d3.select("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
              .append("g")
              .attr("transform", `translate(${margin.left},${margin.top})`);

const xScale = d3.scaleLog().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

const xAxis = d3.axisBottom(xScale);
const yAxis = d3.axisLeft(yScale);

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip");

d3.csv("military_spending.csv").then(data => {
  data.forEach(d => {
    d.GDP = +d.GDP;
    d.MilitaryExpenditure = +d.MilitaryExpenditure;
    d.Year = +d.Year;
  });

  const regionColorScale = d3.scaleOrdinal(d3.schemeCategory10)
                             .domain(Array.from(new Set(data.map(d => d.Region))));

  let highlightedRegions = [];
  let currentScene = 0;

  const scenes = [
    'South Asia',
    'Sub-Saharan Africa',
    'Europe & Central Asia',
    'Middle East & North Africa',
    'Latin America & Caribbean',
    'East Asia & Pacific',
    'North America',
    'No Filter'
  ];

  const narratives = {
    'South Asia': 'South Asia exhibited significant diversity in military spending among its nations. Countries like India, with its substantial military budget, contrast sharply with others in the region where spending is more restrained.',
    'Sub-Saharan Africa': 'Sub-Saharan Africa demonstrated a range of military expenditure levels, from nations heavily investing in their defense sectors to those with minimal military budgets. This disparity highlights the region\'s varied security challenges, from internal conflicts to international peacekeeping contributions.',
    'Europe & Central Asia': 'Europe & Central Asia showed a complex pattern of military expenditure. Western European countries generally have higher budgets due to their advanced defense technologies and commitments to NATO. In contrast, some Central Asian nations allocate more modest budgets.',
    'Middle East & North Africa': 'The Middle East & North Africa region had some of the highest military expenditures globally. The substantial spending by countries such as Saudi Arabia and Egypt reflects ongoing regional conflicts and security concerns.',
    'Latin America & Caribbean': 'Latin America & the Caribbean exhibited a more moderate range of military spending compared to other regions. Countries in the region prioritize military expenditure differently, often focusing on internal security and border protection.',
    'East Asia & Pacific': 'East Asia & Pacific showed varied military spending, with substantial investments from countries like China and Japan. China\'s significant expenditure underscores its growing geopolitical influence and modernization of its military forces.',
    'North America': 'North America, particularly the United States, exhibited high military spending, reflecting its global defense commitments and advanced technological capabilities. The U.S. continues to lead in defense expenditure, driven by its extensive military engagements and strategic interests worldwide.',
    'No Filter': ''
  };

  function updateVisualization(year) {
    const filteredData = data.filter(d => d.Year === year);

    const groupedData = d3.group(filteredData, d => d.CountryName, d => d.Region);
    const averagedData = Array.from(groupedData, ([country, regions]) => {
      return Array.from(regions, ([region, values]) => {
        const avgGDP = d3.mean(values, d => d.GDP);
        const avgExpenditure = d3.mean(values, d => d.MilitaryExpenditure);
        const actualExpenditure = avgGDP * (avgExpenditure / 100);
        return { CountryName: country, Region: region, GDP: avgGDP, MilitaryExpenditure: avgExpenditure, ActualExpenditure: actualExpenditure };
      });
    }).flat();

    xScale.domain(d3.extent(averagedData, d => d.GDP)).nice();
    yScale.domain(d3.extent(averagedData, d => d.MilitaryExpenditure)).nice();

    svg.selectAll("*").remove();

    const circles = svg.selectAll("circle")
                       .data(averagedData)
                       .enter()
                       .append("circle")
                       .attr("cx", d => xScale(d.GDP))
                       .attr("cy", d => yScale(d.MilitaryExpenditure))
                       .attr("r", 5)
                       .attr("fill", d => regionColorScale(d.Region))
                       .attr("opacity", d => (highlightedRegion === null || highlightedRegion === d.Region) ? 1 : 0.2)
                       .on("mouseover", function(event, d) {
                          tooltip.transition().duration(200).style("opacity", .9);
                          tooltip.html(`<strong>Country:</strong> ${d.CountryName}<br>
                                        <strong>Region:</strong> ${d.Region}<br>
                                        <strong>GDP:</strong> ${d.GDP.toFixed(2)} billion<br>
                                        <strong>Military Expenditure:</strong> ${d.MilitaryExpenditure.toFixed(2)}% of GDP<br>
                                        <strong>Actual Military Expenditure:</strong> ${d.ActualExpenditure.toFixed(2)} billion<br>`)
                                 .style("left", (event.pageX + 5) + "px")
                                 .style("top", (event.pageY - 28) + "px");

                          d3.select(this).attr("stroke", "black").attr("stroke-width", 2);
                        })
                       .on("mouseout", function() {
                          tooltip.transition().duration(500).style("opacity", 0);
                          d3.select(this).attr("stroke", "none");
                        });

    svg.selectAll("text")
       .data(averagedData)
       .enter()
       .append("text")
       .attr("x", d => xScale(d.GDP))
       .attr("y", d => yScale(d.MilitaryExpenditure))
       .attr("dy", -10)
       .attr("text-anchor", "middle")
       .style("font-size", "12px")
       .style("fill", d => (highlightedRegion === null || highlightedRegion === d.Region) ? "black" : "none")
       .text(d => d.CountryName);

    const legendWidth = 200;
    const legendHeight = 20;
    const legendRadius = 10;
    const legendMargin = 10;
    const titleMargin = 15;

    const legendGroup = svg.append("g")
                           .attr("transform", `translate(${width - legendWidth - margin.right + 100}, ${margin.top})`);

    legendGroup.append("text")
               .attr("x", 15)
               .attr("y", -titleMargin)
               .attr("text-anchor", "middle")
               .style("font-size", "14px")
               .style("font-weight", "bold")
               .text("Regions");

    const legendItems = Array.from(regionColorScale.domain());

    const legendGroups = legendGroup.selectAll("g")
                                    .data(legendItems)
                                    .enter()
                                    .append("g")
                                    .attr("transform", (d, i) => `translate(0, ${i * (legendRadius * 2 + legendMargin) + titleMargin})`)
                                    .style("cursor", "pointer")
                                    .on("click", (event, region) => {
                                      if (scenes[currentScene] === 'No Filter') {
                                        highlightedRegion = (highlightedRegion === region && region !== 'No Filter') ? null : region;
                                        updateVisualization(+document.getElementById('yearSlider').value);
                                      }
                                    });


    legendGroups.append("circle")
                .attr("r", legendRadius)
                .attr("fill", d => regionColorScale(d))
                .attr("stroke", d => highlightedRegion === d ? "black" : "none")
                .attr("stroke-width", 2);

    legendGroups.append("text")
                .attr("x", legendRadius + 10)
                .attr("y", legendRadius - 10)
                .attr("dy", ".35em")
                .text(d => d)
                .style("fill", d => highlightedRegion === d ? "black" : "gray");

    svg.append("g")
       .attr("transform", `translate(0, ${height})`)
       .call(xAxis);

    svg.append("g")
       .call(yAxis);

    svg.append("text")
       .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 15})`)
       .style("text-anchor", "middle")
       .style("font-size", "14px")
       .style("font-weight", "bold")
       .text("GDP (current US$), in billions");

    svg.append("text")
       .attr("transform", `translate(${-margin.left + 20}, ${height / 2}) rotate(-90)`)
       .style("text-anchor", "middle")
       .style("font-size", "14px")
       .style("font-weight", "bold")
       .text("Military Expenditure (% of GDP)");

    if (scenes[currentScene] !== 'No Filter') {
      const narrativeBoxWidth = 250;
      const narrativeBoxHeight = 130;

      const narrativeBox = svg.selectAll(".narrativeBox").data([currentScene]);

      narrativeBox.enter()
                  .append("rect")
                  .attr("class", "narrativeBox")
                  .attr("x", width - narrativeBoxWidth - margin.right- 150)
                  .attr("y", margin.top)
                  .attr("width", narrativeBoxWidth)
                  .attr("height", narrativeBoxHeight)
                  .attr("fill", "#f9f9f9")
                  .attr("stroke", "#ccc");

      narrativeBox.enter()
                  .append("text")
                  .attr("class", "narrativeText")
                  .attr("x", width - narrativeBoxWidth - margin.right - 140)
                  .attr("y", margin.top + 20)
                  .attr("width", narrativeBoxWidth - 20)
                  .attr("height", narrativeBoxHeight - 40)
                  .style("font-size", "13px")
                  .style("fill", "#333")
                  .text(d => narratives[scenes[d]])
                  .call(wrap, narrativeBoxWidth - 20);
    } else {
      svg.selectAll(".narrativeBox").remove();
      svg.selectAll(".narrativeText").remove();
    }
  }

  function wrap(text, width) {
    text.each(function() {
      const text = d3.select(this);
      const words = text.text().split(/\s+/).reverse();
      let word;
      let line = [];
      let lineNumber = 0;
      const lineHeight = 1.1; 
      let y = text.attr("y");
      let x = text.attr("x");
      const dy = parseFloat(text.attr("dy")) || 0;
      let tspan = text.text(null)
                      .append("tspan")
                      .attr("x", x)
                      .attr("y", y)
                      .attr("dy", `${dy}em`);

      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan")
                      .attr("x", x)
                      .attr("y", y)
                      .attr("dy", `${++lineNumber * lineHeight + dy}em`)
                      .text(word);
        }
      }
    });
  }

  function updateScene(sceneIndex) {
    if (scenes[sceneIndex] === 'No Filter') {
      highlightedRegion = null;
      document.getElementById('yearSlider').disabled = false;
      document.getElementById('yearSlider').style.backgroundColor = "";
    } else {
      highlightedRegion = scenes[sceneIndex];
      document.getElementById('yearSlider').disabled = true;
      document.getElementById('yearSlider').style.backgroundColor = "#d3d3d3";
    }
    
    updateVisualization(+document.getElementById('yearSlider').value);

    document.getElementById('previousButton').disabled = (sceneIndex === 0);
    document.getElementById('previousButton').style.backgroundColor = (sceneIndex === 0) ? "#d3d3d3" : "";
    document.getElementById('nextButton').disabled = (sceneIndex === scenes.length - 1);
    document.getElementById('nextButton').style.backgroundColor = (sceneIndex === scenes.length - 1) ? "#d3d3d3" : "";
    document.getElementById('startOverButton').disabled = (sceneIndex === 0);
    document.getElementById('startOverButton').style.backgroundColor = (sceneIndex === 0) ? "#d3d3d3" : "";
  }

  document.getElementById('previousButton').addEventListener('click', () => {
    currentScene = (currentScene - 1 + scenes.length) % scenes.length;
    updateScene(currentScene);
  });

  document.getElementById('nextButton').addEventListener('click', () => {
    currentScene = (currentScene + 1) % scenes.length;
    updateScene(currentScene);
  });

  document.getElementById('startOverButton').addEventListener('click', () => {
    currentScene = 0;
    updateScene(currentScene);
  });

  const slider = d3.select("#yearSlider");
  const yearLabel = d3.select("#yearLabel");

  slider
    .attr("min", 1960)
    .attr("max", 2022)
    .attr("value", 2021)
    .on("input", function() {
      yearLabel.text(this.value);
      updateVisualization(+this.value);
    });

  yearLabel.text(2021);
  updateScene(currentScene);
});
