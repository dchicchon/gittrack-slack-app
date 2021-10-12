import * as  d3 from 'd3'
import cheerio from 'cheerio'
import axios from 'axios'
import fs from 'fs'
import D3Node from 'd3-node'
import sharp from 'sharp'

// const fs = require('fs')
// const D3Node = require('d3-node')
// const sharp = require('sharp')

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

