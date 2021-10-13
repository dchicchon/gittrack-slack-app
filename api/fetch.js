import cheerio from 'cheerio'
import axios from 'axios'
import * as d3 from 'd3'
import fetch from 'node-fetch'
import D3Node from 'd3-node'
import * as fs from 'fs'
import sharp from 'sharp'

async function fetchYears(username) {
  const response = await axios.get(`https://github.com/${username}`);
  const $ = cheerio.load(response.data);
  
  return $(".js-year-link")
    .get()
    .map((a) => {
      const $a = $(a);
      return {
        href: $a.attr("href"),
      };
    });
}

async function fetchDataForYear(url) {
  const response = await axios.get(`https://github.com${url}`);
  const $ = cheerio.load(response.data);
  const $days = $("svg.js-calendar-graph-svg rect.ContributionCalendar-day");
  const todayDate = new Date();
  return {
    contributions: (() => {
      const arr = [];
      for (const day of $days) {
        const $day = $(day);
        const date = $day
          .attr("data-date")
          .split("-")
          .map((d) => parseInt(d, 10));
        const dateString = `${date[1]}-${date[2]}-${date[0]}`;
        const newDate = new Date(dateString);
        const weekMS = 1000 * 60 * 60 * 24 * 7;
        const diff = todayDate.getTime() - newDate.getTime();
        if (diff < weekMS && diff > 0) {
          const count = parseInt($day.attr("data-count"), 10);
          arr.push({ count, dateString });
        }
      }
      return arr;
    })(),
  };
}

export async function fetchPastWeek(username) {
  const years = await fetchYears(username);
  const resp = await fetchDataForYear(years[0].href);
  return resp;
}

export async function makeGraph() {

  // either try to upload it or updating the graph to use a line graph instead
  const options = {
    d3Module: d3,
    selector: '#chart',
    container: '<div id="container"><div id="chart"></div></div>',
    styles: ` 
            @font-face {
                font-family: Merriweather;
                src: './fonts/Merriweather-Bold.ttf'';
            },

            @font-face {
                font-family: Source Sans Pro;
                src: './fonts/SourceSansPro-Regular.ttf'';
            }
            `
  }
  const d3n = new D3Node(options);
  const margin = {
    top: 10, right: 5, bottom: 30, left: 5
  }

  const width = 1000 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
  const svgWidth = width + margin.left + margin.right;
  const svgHeight = height + margin.top + margin.bottom;

  const svg = d3n.createSVG(svgWidth, svgHeight);
  
  // test data
  const tempData = [{ year: 2020, value: 100 }, { year: 2019, value: 200 }, { year: 2018, value: 30 }, { year: 2017, value: 50 }, { year: 2016, value: 80 }];

  const xScale = d3.scaleBand().range([0,width]).padding(0.5);
  const yScale = d3.scaleLinear().range([height,0]);
  
  let yMax = d3.max(tempData, (d) => {return d.value})
  yMax += yMax * 0.3;
  xScale.domain(tempData.map((d) => {return d.year} ))
  yScale.domain([0,yMax]);

  svg.append('rect')
    .attr('width','100%')
    .attr('height', '100%')
    .style('fill','rgb(28, 35, 51);');

  svg.append('text')
    .attr('transform','translate(150,0)')
    .attr('fill','#85ceff')
    .attr('font-size','24px')
    .attr('x',50)
    .attr('y',50)
    .text('Node and D3 Bar chart')
  
  svg.append('g').attr('transform',`translate(${100}, ${100})`);

  svg.append('g')
    .attr('transform', `translate(50, ${height})`)
    .call(d3.axisBottom(xScale))
    .append('text')
    .attr('y', height-380)
    .attr('x',width-500)
    .attr('text-anchor','end')
    .attr('stroke','black')
    .attr('fill','#85ceff')
    .attr('font-size','20px')
    .text('Year')
  
  svg.append('g')
    .attr('transform','translate(50,0)')
    .call(d3.axisLeft(yScale).tickFormat((d) => {
      return `$${d}`;
    }).ticks(5))
    .append('text')
    .attr('transform','rotate(-90)')
    .attr('y',150)
    .attr('x',-150)
    .attr('dy','-9.1em')
    .attr('text-anchor','end')
    .attr('stroke','black')
    .attr('font-size','20px')
    .attr('fill','#85ceff')
    .text('Cost')
  
  svg.selectAll('.bar')
    .data(tempData)
    .enter().append('rect')
    .attr('transform','translate(50,0)')
    .attr('class','bar')
    .attr('x',(d) => {return xScale(d.year)})
    .attr('y', (d) => {return yScale(d.value)})
    .attr('width', xScale.bandwidth())
    .attr('height',(d) => {return height - yScale(d.value)})
    .style('fill','orange')

  fs.writeFileSync('out.svg', d3n.svgString());
  sharp('out.svg')
    .png()
    .toFile('sharp.png')
    .then((info) => {
      console.log("Svg to Png conversion completed", info);
    })
    .catch((error) => {
      console.log(error)
    })
}



