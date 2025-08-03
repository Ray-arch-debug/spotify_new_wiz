// My Spotify Narrative Visualization
// Learning D3.js and narrative visualization concepts

// Global variables to track state
let currentScene = 0;
let totalScenes = 4;
let spotifyData = null;
let filteredData = null;
let selectedGenre = null;
let selectedYear = null;

// Define what each scene should show
const sceneConfigs = [
  {
    id: 0,
    title: "Welcome to Spotify Music Trends",
    description: "Let's explore how music has changed over the years using Spotify data. This shows some basic stats to get started.",
    chartType: "overview"
  },
  {
    id: 1,
    title: "How Genres Changed Over Time",
    description: "This chart shows which music genres were popular in different decades. You can click on genres to learn more about them.",
    chartType: "genre-timeline"
  },
  {
    id: 2,
    title: "Danceability vs Energy Analysis",
    description: "This scatter plot shows how danceable and energetic different songs are. The size of each point shows popularity.",
    chartType: "scatter-plot"
  },
  {
    id: 3,
    title: "Most Popular Artists",
    description: "This shows the top artists based on their average track popularity. Hover to see more details.",
    chartType: "artist-analysis"
  }
];

// Main function to start everything
async function startVisualization() {
  try {
    console.log("Starting visualization...");
    console.log("Checking if spotifyData exists:", typeof spotifyData);
    
    console.log("Loading Spotify data...");
    
    // Load the CSV file with proper parsing
    spotifyData = await d3.csv("data/spotify_tracks_with_artist_data.csv");
    
    console.log("Loaded", spotifyData.length, "tracks");
    console.log("Sample raw data:", spotifyData.slice(0, 3));
    console.log("Sample track 0 keys:", Object.keys(spotifyData[0]));
    
    console.log("Cleaning data...");
    // Clean up the data
    cleanData();
    
    console.log("Setting up UI...");
    // Set up the UI
    makeNavigationButtons();
    updateProgressBar();
    
    console.log("Showing first scene...");
    // Show the first scene
    showScene(0);
    
    console.log("Visualization started successfully!");
    
  } catch (error) {
    console.error("Error loading data:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    document.getElementById('scene-container').innerHTML = 
      '<div class="scene"><h2>Error loading data</h2><p>Make sure your CSV file is in the data folder.</p><p>Error: ' + error.message + '</p></div>';
  }
}

// Clean and prepare the data
function cleanData() {
  console.log("Starting data cleaning...");
  console.log("Sample raw data:", spotifyData.slice(0, 3));
  
  spotifyData.forEach((track, index) => {
    // Convert string numbers to actual numbers
    track.popularity_track = +track.popularity_track || 0;
    track.popularity_artist = +track.popularity_artist || 0;
    track.danceability = +track.danceability || 0;
    track.energy = +track.energy || 0;
    
    // Get the year from release date
    track.release_date = new Date(track.release_date);
    track.year = track.release_date.getFullYear();
    
    // Handle the genres - check both genres and genre columns
    let genreList = [];
    let primaryGenre = 'Unknown'; // Default primary genre

    // First, try to parse the 'genres' column if it exists and is not empty '[]'
    if (track.genres && track.genres !== '[]' && track.genres !== '') {
      try {
        // Handle the genre string more carefully
        let genreStr = track.genres;
        
        // If it starts with [ and ends with ], it's a JSON array
        if (genreStr.startsWith('[') && genreStr.endsWith(']')) {
          // Remove the outer brackets and split by comma
          genreStr = genreStr.slice(1, -1);
          // Split by comma and clean up each genre
          genreList = genreStr.split(',')
            .map(g => g.trim().replace(/^['"]|['"]$/g, '')) // Remove quotes from start/end
            .filter(g => g.length > 0); // Remove empty strings
        } else {
          // Try JSON parsing as fallback
          genreStr = track.genres.replace(/'/g, '"');
          genreList = JSON.parse(genreStr);
        }
        
        if (genreList.length > 0) {
          primaryGenre = genreList[0]; // Take the first genre as primary
        }
      } catch (e) {
        if (index < 5) { // Only log first few errors to avoid spam
          console.log("Failed to parse genres:", track.genres);
        }
      }
    }
    
    // If primaryGenre is still 'Unknown' from 'genres' column, try the 'genre' column
    if (primaryGenre === 'Unknown' && track.genre && track.genre !== 'Unknown' && track.genre !== '') {
      // Clean up the genre column - remove quotes, brackets, and extra characters
      let cleanGenre = track.genre
        .replace(/['"]/g, '') // Remove quotes
        .replace(/[\[\]]/g, '') // Remove brackets
        .replace(/\]"/g, '') // Remove trailing bracket-quote combinations
        .replace(/^["']|["']$/g, '') // Remove quotes from start/end
        .trim();
      
      if (cleanGenre && cleanGenre !== 'Unknown' && cleanGenre !== '' && cleanGenre.length > 0) {
        primaryGenre = cleanGenre;
      }
    }
    
    // Assign the determined primary genre
    track.primary_genre = primaryGenre;
    
    // Log first few tracks for debugging
    if (index < 5) {
      console.log(`Track ${index}:`, {
        name: track.name_track,
        genres: track.genres,
        genre: track.genre,
        primary_genre: track.primary_genre,
        genreList: genreList
      });
    }
  });
  
  // Check if primary_genre is being set correctly
  const sampleTracks = spotifyData.slice(0, 10);
  console.log("Sample tracks after cleaning:", sampleTracks.map(t => ({
    name: t.name_track,
    primary_genre: t.primary_genre,
    hasPrimaryGenre: t.hasOwnProperty('primary_genre')
  })));
  
  // Remove tracks with weird years
  spotifyData = spotifyData.filter(track => track.year >= 1920 && track.year <= 2023);
  filteredData = spotifyData;
  
  // Log some statistics to debug
  const genreCounts = d3.rollup(spotifyData, v => v.length, d => d.primary_genre);
  console.log("All genre counts:", Array.from(genreCounts.entries()).slice(0, 20));
  
  // Let's see what the actual keys look like
  const allGenres = Array.from(genreCounts.entries());
  console.log("First 10 genre entries:", allGenres.slice(0, 10));
  
  const topGenres = allGenres
    .filter(genre => {
      const genreName = genre[0]; // First element is the key
      const genreCount = genre[1]; // Second element is the value
      const isValid = genreName !== '' && genreName !== undefined;
      if (!isValid && genreCount > 100) { // Log if we're filtering out a genre with many tracks
        console.log("Filtering out genre:", genreName, "with", genreCount, "tracks");
      }
      return isValid;
    })
    .sort((a, b) => b[1] - a[1]) // Sort by count (second element)
    .slice(0, 10)
    .map(genre => ({ key: genre[0], value: genre[1] })); // Convert to object format for display
  
  console.log("Top genres after filtering:", topGenres);
  
  console.log("Data cleaning completed successfully!");
}

// Create the navigation buttons
function makeNavigationButtons() {
  const nav = document.getElementById('navigation');
  nav.innerHTML = '';
  
  sceneConfigs.forEach((scene, index) => {
    const button = document.createElement('button');
    button.className = 'nav-button';
    button.textContent = `Scene ${index + 1}`;
    button.onclick = () => showScene(index);
    nav.appendChild(button);
  });
}

// Update the progress bar
function updateProgressBar() {
  const progress = ((currentScene + 1) / totalScenes) * 100;
  document.getElementById('progress-bar').style.width = `${progress}%`;
}

// Show a specific scene
function showScene(sceneIndex) {
  currentScene = sceneIndex;
  updateProgressBar();
  updateButtonStates();
  
  const scene = sceneConfigs[sceneIndex];
  const container = document.getElementById('scene-container');
  
  // Clear the container
  container.innerHTML = '';
  
  // Make the scene element
  const sceneDiv = document.createElement('div');
  sceneDiv.className = 'scene';
  sceneDiv.innerHTML = `
    <h2 class="scene-title">${scene.title}</h2>
    <p class="scene-description">${scene.description}</p>
    <div class="chart-container" id="chart-${sceneIndex}"></div>
  `;
  
  container.appendChild(sceneDiv);
  
  // Add animation
  setTimeout(() => sceneDiv.classList.add('active'), 100);
  
  // Draw the right chart based on scene type
  switch (scene.chartType) {
    case 'overview':
      drawOverview();
      break;
    case 'genre-timeline':
      drawGenreTimeline();
      break;
    case 'scatter-plot':
      drawScatterPlot();
      break;
    case 'artist-analysis':
      drawArtistAnalysis();
      break;
  }
}

// Update which button is active
function updateButtonStates() {
  const buttons = document.querySelectorAll('.nav-button');
  buttons.forEach((button, index) => {
    if (index === currentScene) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Scene 1: Overview dashboard
function drawOverview() {
  const container = document.getElementById('chart-0');
  
  // Calculate some basic stats
  const totalTracks = spotifyData.length;
  const avgPopularity = d3.mean(spotifyData, d => d.popularity_track);
  const yearRange = d3.extent(spotifyData, d => d.year);
  
  // Get top genres - process the data directly here
  const genreCounts = d3.rollup(spotifyData, v => v.length, d => d.primary_genre);
  console.log("All genre counts:", Array.from(genreCounts.entries()).slice(0, 20));
  
  // Let's see what the actual keys look like
  const allGenres = Array.from(genreCounts.entries());
  console.log("First 10 genre entries:", allGenres.slice(0, 10));
  
  const topGenres = allGenres
    .filter(genre => {
      const genreName = genre[0]; // First element is the key
      const genreCount = genre[1]; // Second element is the value
      const isValid = genreName !== '' && genreName !== undefined;
      if (!isValid && genreCount > 100) { // Log if we're filtering out a genre with many tracks
        console.log("Filtering out genre:", genreName, "with", genreCount, "tracks");
      }
      return isValid;
    })
    .sort((a, b) => b[1] - a[1]) // Sort by count (second element)
    .slice(0, 10)
    .map(genre => ({ key: genre[0], value: genre[1] })); // Convert to object format for display
  
  console.log("Top genres after filtering:", topGenres);
  
  // If we don't have enough genres, show what we have
  const genresToShow = topGenres.length > 0 ? topGenres : [
    { key: 'No valid genres found', value: 0 }
  ];
  
  console.log("Genres to show:", genresToShow);
  console.log("topGenres.length:", topGenres.length);
  console.log("genresToShow.length:", genresToShow.length);
  
  // Create the overview content
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin: 2rem 0;">
      <div style="text-align: center; padding: 2rem; background: linear-gradient(135deg, #1db954, #1ed760); color: white; border-radius: 15px;">
        <h3 style="font-size: 2rem; margin-bottom: 0.5rem;">${totalTracks.toLocaleString()}</h3>
        <p>Total Tracks</p>
      </div>
      <div style="text-align: center; padding: 2rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 15px;">
        <h3 style="font-size: 2rem; margin-bottom: 0.5rem;">${Math.round(avgPopularity)}</h3>
        <p>Average Popularity</p>
      </div>
      <div style="text-align: center; padding: 2rem; background: linear-gradient(135deg, #f093fb, #f5576c); color: white; border-radius: 15px;">
        <h3 style="font-size: 2rem; margin-bottom: 0.5rem;">${yearRange[1] - yearRange[0]}</h3>
        <p>Years of Data</p>
      </div>
    </div>
    
    <div style="margin: 3rem 0;">
      <h3 style="text-align: center; margin-bottom: 2rem; color: #1db954;">Top Genres</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        ${genresToShow.map(genre => `
          <div style="padding: 1rem; background: rgba(29, 185, 84, 0.1); border-radius: 10px; text-align: center;">
            <strong>${genre.key}</strong><br>
            <span style="color: #666;">${genre.value} tracks</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div style="text-align: center; margin: 2rem 0;">
      <p style="font-size: 1.1rem; color: #666;">
        Click on any scene button above to explore the data in more detail.
      </p>
    </div>
  `;
}

// Scene 2: Genre timeline chart
function drawGenreTimeline() {
  const container = document.getElementById('chart-1');
  
  // Group data by genre and decade, but filter out "Unknown" and empty genres
  const timelineData = d3.rollup(spotifyData, 
    v => v.length, 
    d => d.primary_genre, 
    d => Math.floor(d.year / 10) * 10
  );
  
  // Filter out "Unknown" and empty genres, then get top genres by total count
  const validGenres = Array.from(timelineData.entries())
    .filter(([genre, decadeData]) => {
      const totalTracks = Array.from(decadeData.values()).reduce((sum, count) => sum + count, 0);
      return genre !== 'Unknown' && genre !== '' && genre !== undefined && totalTracks > 50; // Only genres with more than 50 tracks total
    })
    .sort((a, b) => {
      const aTotal = Array.from(a[1].values()).reduce((sum, count) => sum + count, 0);
      const bTotal = Array.from(b[1].values()).reduce((sum, count) => sum + count, 0);
      return bTotal - aTotal; // Sort by total tracks descending
    })
    .slice(0, 8) // Take top 8 valid genres
    .map(([genre, decadeData]) => genre);
  
  const genres = validGenres;
  const decades = Array.from(new Set(spotifyData.map(d => Math.floor(d.year / 10) * 10))).sort();
  
  // Set up the chart dimensions
  const margin = {top: 40, right: 30, bottom: 60, left: 60};
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
  
  // Clear container
  container.innerHTML = '';
  
  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Set up scales
  const xScale = d3.scaleBand()
    .domain(decades)
    .range([0, width])
    .padding(0.1);
  
  // Calculate the maximum total height for any decade (sum of all genres)
  const maxTotalHeight = d3.max(decades, decade => {
    return genres.reduce((total, genre) => {
      return total + (timelineData.get(genre)?.get(decade) || 0);
    }, 0);
  });
  
  const yScale = d3.scaleLinear()
    .domain([0, maxTotalHeight])
    .range([height, 0]);
  
  const colorScale = d3.scaleOrdinal()
    .domain(genres)
    .range(d3.schemeCategory10);
  
  // Create stacked data
  const stackedData = decades.map(decade => {
    const stack = {};
    let currentY = 0;
    
    genres.forEach(genre => {
      const value = timelineData.get(genre)?.get(decade) || 0;
      stack[genre] = {
        y0: currentY,
        y1: currentY + value,
        value: value
      };
      currentY += value;
    });
    
    return { decade, ...stack };
  });
  
  // Draw the stacked bars
  genres.forEach((genre, i) => {
    const genreGroup = svg.append('g')
      .attr('class', 'genre-group')
      .style('cursor', 'pointer');
    
    genreGroup.selectAll('rect')
      .data(stackedData)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.decade))
      .attr('y', d => yScale(d[genre].y1))
      .attr('width', xScale.bandwidth())
      .attr('height', d => yScale(d[genre].y0) - yScale(d[genre].y1))
      .attr('fill', colorScale(genre))
      .attr('opacity', 0.8)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1);
        showTooltip(event, `${genre}: ${d[genre].value} tracks in ${d.decade}s`);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8);
        hideTooltip();
      })
      .on('click', () => {
        selectedGenre = genre;
        showScene(2); // Go to scatter plot
      });
  });
  
  // Add axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
    .style('text-anchor', 'middle');
  
  svg.append('g')
    .call(d3.axisLeft(yScale));
  
  // Add labels
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 10)
    .style('text-anchor', 'middle')
    .text('Decade');
  
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 20)
    .attr('x', -height / 2)
    .style('text-anchor', 'middle')
    .text('Number of Tracks');
  
  // Add legend
  const legend = container.appendChild(document.createElement('div'));
  legend.className = 'legend';
  legend.innerHTML = genres.map(genre => `
    <div class="legend-item">
      <div class="legend-color" style="background: ${colorScale(genre)}"></div>
      <span>${genre}</span>
    </div>
  `).join('');
  
  // Add helpful guide instead of distracting annotation
  const guide = container.appendChild(document.createElement('div'));
  guide.style.cssText = `
    background: rgba(29, 185, 84, 0.1);
    border: 2px solid #1db954;
    border-radius: 10px;
    padding: 15px;
    margin: 20px 0;
    text-align: center;
    font-size: 0.95rem;
    color: #333;
  `;
  
  guide.innerHTML = `
    <strong>🎵 Genre Timeline Guide</strong><br>
    <span style="font-size: 0.9rem; color: #666;">
      • Each bar shows a decade<br>
      • Colors represent different genres<br>
      • Click any genre to explore it in detail<br>
      • Use Scene 3 & 4 to dive deeper into your chosen genre
    </span>
  `;
}

// Scene 3: Scatter plot
function drawScatterPlot() {
  const container = document.getElementById('chart-2');
  
  // Filter data if a genre is selected, and sample if too many points
  let plotData = selectedGenre ? 
    spotifyData.filter(d => d.primary_genre === selectedGenre) :
    spotifyData;
  
  console.log(`Drawing scatter plot with ${plotData.length} tracks${selectedGenre ? ` for genre: ${selectedGenre}` : ' (all genres)'}`);
  
  // Sample data if there are too many points to improve performance
  if (plotData.length > 10000) {
    const sampleSize = 10000;
    const step = Math.floor(plotData.length / sampleSize);
    plotData = plotData.filter((_, index) => index % step === 0);
    console.log(`Sampled ${plotData.length} points from ${spotifyData.length} total for better performance`);
  }
  
  // Set up dimensions
  const margin = {top: 40, right: 30, bottom: 60, left: 60};
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  
  // Clear container
  container.innerHTML = '';
  
  // Add helpful guide at the TOP instead of bottom
  const scatterGuide = container.appendChild(document.createElement('div'));
  scatterGuide.style.cssText = `
    background: rgba(29, 185, 84, 0.1);
    border: 2px solid #1db954;
    border-radius: 10px;
    padding: 15px;
    margin: 20px 0;
    text-align: center;
    font-size: 0.95rem;
    color: #333;
  `;
  
  if (selectedGenre) {
    scatterGuide.innerHTML = `
      <strong>🎵 ${selectedGenre} Music Analysis</strong><br>
      <span style="font-size: 0.9rem; color: #666;">
        Each point represents a track. Circle size shows popularity. 
        Hover over points to see track details!
      </span>
    `;
  } else {
    scatterGuide.innerHTML = `
      <strong>🎵 Music Characteristics Guide</strong><br>
      <span style="font-size: 0.9rem; color: #666;">
        • Each point = one track<br>
        • Circle size = popularity<br>
        • Hover for details<br>
        • Click on any genre in Scene 2 to filter
      </span>
    `;
  }
  
  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Set up scales
  const xScale = d3.scaleLinear()
    .domain([0, 1])
    .range([0, width]);
  
  const yScale = d3.scaleLinear()
    .domain([0, 1])
    .range([height, 0]);
  
  const sizeScale = d3.scaleLinear()
    .domain([0, 100])
    .range([3, 15]);
  
  const colorScale = d3.scaleOrdinal()
    .domain(Array.from(new Set(plotData.map(d => d.primary_genre))))
    .range(d3.schemeCategory10);
  
  // Add grid lines
  svg.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));
  
  svg.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(''));
  
  // Add the points
  svg.selectAll('circle')
    .data(plotData)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.danceability))
    .attr('cy', d => yScale(d.energy))
    .attr('r', d => sizeScale(d.popularity_track))
    .attr('fill', d => colorScale(d.primary_genre))
    .attr('opacity', 0.6)
    .attr('class', 'interactive-element')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1).attr('stroke', '#333').attr('stroke-width', 2);
      showTooltip(event, `
        <strong>${d.name_track}</strong><br>
        Artist: ${d.name_artist}<br>
        Genre: ${d.primary_genre}<br>
        Danceability: ${(d.danceability * 100).toFixed(1)}%<br>
        Energy: ${(d.energy * 100).toFixed(1)}%<br>
        Popularity: ${d.popularity_track}
      `);
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.6).attr('stroke', 'none');
      hideTooltip();
    });
  
  // Add axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale));
  
  svg.append('g')
    .call(d3.axisLeft(yScale));
  
  // Add axis labels
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 10)
    .style('text-anchor', 'middle')
    .text('Danceability');
  
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 20)
    .attr('x', -height / 2)
    .style('text-anchor', 'middle')
    .text('Energy');
  
  // Add title
  const title = selectedGenre ? 
    `Danceability vs Energy for ${selectedGenre}` :
    'Danceability vs Energy by Genre';
  
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -10)
    .style('text-anchor', 'middle')
    .style('font-size', '1.2rem')
    .style('font-weight', 'bold')
    .text(title);
  
  // Add legend
  const legend = container.appendChild(document.createElement('div'));
  legend.className = 'legend';
  legend.innerHTML = `
    <div class="legend-item">
      <div class="legend-color" style="background: #1db954"></div>
      <span>Circle size = Popularity</span>
    </div>
  `;
  
  // Add helpful guide instead of distracting annotation
  const guide = container.appendChild(document.createElement('div'));
  guide.style.cssText = `
    background: rgba(29, 185, 84, 0.1);
    border: 2px solid #1db954;
    border-radius: 10px;
    padding: 15px;
    margin: 20px 0;
    text-align: center;
    font-size: 0.95rem;
    color: #333;
  `;
  
  if (selectedGenre) {
    guide.innerHTML = `
      <strong>🎵 ${selectedGenre} Music Analysis</strong><br>
      <span style="font-size: 0.9rem; color: #666;">
        Each point represents a track. Circle size shows popularity. 
        Hover over points to see track details!
      </span>
    `;
  } else {
    guide.innerHTML = `
      <strong>🎵 Music Characteristics Guide</strong><br>
      <span style="font-size: 0.9rem; color: #666;">
        • Each point = one track<br>
        • Circle size = popularity<br>
        • Hover for details<br>
        • Click on any genre in Scene 2 to filter
      </span>
    `;
  }
}

// Scene 4: Artist analysis
function drawArtistAnalysis() {
  const container = document.getElementById('chart-3');
  
  // Filter data if a genre is selected
  const filteredData = selectedGenre ? 
    spotifyData.filter(d => d.primary_genre === selectedGenre) :
    spotifyData;
  
  console.log(`Drawing artist analysis with ${filteredData.length} tracks${selectedGenre ? ` for genre: ${selectedGenre}` : ' (all genres)'}`);
  
  // Group data by artist
  const artistData = d3.rollup(filteredData, 
    v => ({
      tracks: v.length,
      avgTrackPopularity: d3.mean(v, d => d.popularity_track),
      avgArtistPopularity: d3.mean(v, d => d.popularity_artist),
      genres: Array.from(new Set(v.map(d => d.primary_genre)))
    }), 
    d => d.name_artist
  );
  
  console.log("Artist data entries:", Array.from(artistData.entries()).length);
  console.log("Sample artist data:", Array.from(artistData.entries()).slice(0, 3));
  
  // Get artists with filtering options
  const allArtists = Array.from(artistData.entries())
    .filter(d => {
      const artistData = d[1]; // d[1] is the value object
      return artistData && artistData.tracks >= 3; // Lowered threshold for more options
    })
    .map(d => ({ key: d[0], value: d[1] })); // Convert to {key, value} format
  
  // Default to top 10 by popularity
  let topArtists = allArtists
    .sort((a, b) => b.value.avgTrackPopularity - a.value.avgTrackPopularity)
    .slice(0, 10);
  
  console.log("Top artists with 5+ tracks:", topArtists.length);
  console.log("Top artists:", topArtists.slice(0, 5));
  
  // Set up dimensions with more space for artist names
  const margin = {top: 40, right: 30, bottom: 60, left: 200};
  const width = 800 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom; // Increased height for better spacing
  
  // Clear container
  container.innerHTML = '';
  
  // Add helpful guide at the TOP instead of bottom
  const artistGuide = container.appendChild(document.createElement('div'));
  artistGuide.style.cssText = `
    background: rgba(29, 185, 84, 0.1);
    border: 2px solid #1db954;
    border-radius: 10px;
    padding: 15px;
    margin: 20px 0;
    text-align: center;
    font-size: 0.95rem;
    color: #333;
  `;
  
  if (selectedGenre) {
    artistGuide.innerHTML = `
      <strong>🎵 Exploring ${selectedGenre} Genre</strong><br>
      <span style="font-size: 0.9rem; color: #666;">
        Use the filters below to discover different artists in this genre. 
        Try "Bottom by Popularity" to find hidden gems!
      </span>
    `;
  } else {
    artistGuide.innerHTML = `
      <strong>🎵 Artist Discovery Guide</strong><br>
      <span style="font-size: 0.9rem; color: #666;">
        • Use filters below to explore different perspectives<br>
        • Try "Bottom by Popularity" to find underrated artists<br>
        • Click on any genre in Scene 2 to filter by that genre
      </span>
    `;
  }
  
  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Set up scales
  const xScale = d3.scaleLinear()
    .domain([0, d3.max(topArtists, d => d.value.avgTrackPopularity)])
    .range([0, width]);
  
  const yScale = d3.scaleBand()
    .domain(topArtists.map(d => d.key))
    .range([0, height])
    .padding(0.2);
  
  // Create a colorful gradient for the bars
  const colorScale = d3.scaleOrdinal()
    .domain(topArtists.map(d => d.key))
    .range(d3.schemeCategory10);
  
  // Draw the bars with different colors
  svg.selectAll('rect')
    .data(topArtists)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', d => yScale(d.key))
    .attr('width', d => xScale(d.value.avgTrackPopularity))
    .attr('height', yScale.bandwidth())
    .attr('fill', d => colorScale(d.key))
    .attr('opacity', 0.8)
    .attr('rx', 3) // Rounded corners
    .attr('class', 'interactive-element')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1).attr('stroke', '#333').attr('stroke-width', 2);
      showTooltip(event, `
        <strong>${d.key}</strong><br>
        Tracks: ${d.value.tracks}<br>
        Avg Track Popularity: ${Math.round(d.value.avgTrackPopularity)}<br>
        Avg Artist Popularity: ${Math.round(d.value.avgArtistPopularity)}<br>
        Genres: ${d.value.genres.slice(0, 3).join(', ')}
      `);
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.8).attr('stroke', 'none');
      hideTooltip();
    });
  

  
  // Add axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale));
  
  svg.append('g')
    .attr('class', 'axis-left')
    .call(d3.axisLeft(yScale))
    .selectAll('text')
    .style('font-size', '1rem')
    .style('font-weight', '500')
    .style('fill', '#333');
  
  // Add labels
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 10)
    .style('text-anchor', 'middle')
    .text('Average Track Popularity');
  
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 20)
    .attr('x', -height / 2)
    .style('text-anchor', 'middle')
    .text('Artist');
  
  // Add title
  const titleText = selectedGenre ? 
    `Top Artists in ${selectedGenre} Genre` : 
    'Top Artists by Average Track Popularity';
  
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -10)
    .style('text-anchor', 'middle')
    .style('font-size', '1.2rem')
    .style('font-weight', 'bold')
    .text(titleText);
  

  
  // Add filter controls
  const filterControls = container.appendChild(document.createElement('div'));
  filterControls.style.cssText = `
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
    align-items: center;
  `;
  
  // Number of artists selector
  const countSelect = filterControls.appendChild(document.createElement('select'));
  countSelect.innerHTML = `
    <option value="5">Top 5</option>
    <option value="10" selected>Top 10</option>
    <option value="15">Top 15</option>
    <option value="20">Top 20</option>
  `;
  countSelect.style.cssText = `
    padding: 8px 12px;
    border: 2px solid #1db954;
    border-radius: 6px;
    background: white;
    font-size: 0.9rem;
    cursor: pointer;
  `;
  
  // Ranking method selector
  const rankSelect = filterControls.appendChild(document.createElement('select'));
  rankSelect.innerHTML = `
    <option value="popularity" selected>By Popularity</option>
    <option value="tracks">By Number of Tracks</option>
    <option value="artist-popularity">By Artist Popularity</option>
  `;
  rankSelect.style.cssText = `
    padding: 8px 12px;
    border: 2px solid #1db954;
    border-radius: 6px;
    background: white;
    font-size: 0.9rem;
    cursor: pointer;
  `;
  
  // Order selector (top/bottom)
  const orderSelect = filterControls.appendChild(document.createElement('select'));
  orderSelect.innerHTML = `
    <option value="top" selected>Top</option>
    <option value="bottom">Bottom</option>
  `;
  orderSelect.style.cssText = `
    padding: 8px 12px;
    border: 2px solid #1db954;
    border-radius: 6px;
    background: white;
    font-size: 0.9rem;
    cursor: pointer;
  `;
  
  // Clear filter button
  const clearButton = filterControls.appendChild(document.createElement('button'));
  clearButton.textContent = 'Clear Filters';
  clearButton.style.cssText = `
    padding: 8px 16px;
    background: #ff6b6b;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.3s;
  `;
  clearButton.onmouseover = () => clearButton.style.background = '#ff5252';
  clearButton.onmouseout = () => clearButton.style.background = '#ff6b6b';
  
  // Add event listeners
  countSelect.onchange = updateChart;
  rankSelect.onchange = updateChart;
  orderSelect.onchange = updateChart;
  clearButton.onclick = () => {
    selectedGenre = null;
    showScene(3); // Refresh the scene
  };
  
  // Function to update the chart
  function updateChart() {
    const count = parseInt(countSelect.value);
    const ranking = rankSelect.value;
    const order = orderSelect.value;
    
    // Sort based on ranking method
    let sortedArtists = [...allArtists];
    if (ranking === 'popularity') {
      sortedArtists.sort((a, b) => b.value.avgTrackPopularity - a.value.avgTrackPopularity);
    } else if (ranking === 'tracks') {
      sortedArtists.sort((a, b) => b.value.tracks - a.value.tracks);
    } else if (ranking === 'artist-popularity') {
      sortedArtists.sort((a, b) => b.value.avgArtistPopularity - a.value.avgArtistPopularity);
    }
    
    // Apply order (top or bottom)
    if (order === 'bottom') {
      sortedArtists.reverse();
    }
    
    // Take the specified number
    topArtists = sortedArtists.slice(0, count);
    
    // Redraw the chart
    drawChart();
  }
  
  // Function to draw the actual chart
  function drawChart() {
    // Clear previous chart
    const existingSvg = container.querySelector('svg');
    if (existingSvg) {
      existingSvg.remove();
    }
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(topArtists, d => d.value.avgTrackPopularity)])
      .range([0, width]);
    
    const yScale = d3.scaleBand()
      .domain(topArtists.map(d => d.key))
      .range([0, height])
      .padding(0.2);
    
    // Create a colorful gradient for the bars
    const colorScale = d3.scaleOrdinal()
      .domain(topArtists.map(d => d.key))
      .range(d3.schemeCategory10);
    
    // Draw the bars with different colors
    svg.selectAll('rect')
      .data(topArtists)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', d => yScale(d.key))
      .attr('width', d => xScale(d.value.avgTrackPopularity))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.key))
      .attr('opacity', 0.8)
      .attr('rx', 3) // Rounded corners
      .attr('class', 'interactive-element')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#333').attr('stroke-width', 2);
        showTooltip(event, `
          <strong>${d.key}</strong><br>
          Tracks: ${d.value.tracks}<br>
          Avg Track Popularity: ${Math.round(d.value.avgTrackPopularity)}<br>
          Avg Artist Popularity: ${Math.round(d.value.avgArtistPopularity)}<br>
          Genres: ${d.value.genres.slice(0, 3).join(', ')}
        `);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8).attr('stroke', 'none');
        hideTooltip();
      });
    
    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale));
    
    svg.append('g')
      .attr('class', 'axis-left')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '1rem')
      .style('font-weight', '500')
      .style('fill', '#333');
    
    // Add labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 10)
      .style('text-anchor', 'middle')
      .text('Average Track Popularity');
    
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 20)
      .attr('x', -height / 2)
      .style('text-anchor', 'middle')
      .text('Artist');
    
    // Add title
    const titleText = selectedGenre ? 
      `Top Artists in ${selectedGenre} Genre` : 
      'Top Artists by Average Track Popularity';
    
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .style('text-anchor', 'middle')
      .style('font-size', '1.2rem')
      .style('font-weight', 'bold')
      .text(titleText);
  }
  
  // Initial chart draw
  drawChart();
}

// Tooltip functions
function showTooltip(event, content) {
  const tooltip = document.getElementById('tooltip');
  tooltip.innerHTML = content;
  tooltip.style.left = event.pageX + 10 + 'px';
  tooltip.style.top = event.pageY - 10 + 'px';
  tooltip.style.opacity = 1;
}

function hideTooltip() {
  const tooltip = document.getElementById('tooltip');
  tooltip.style.opacity = 0;
}

// Start everything when the page loads
document.addEventListener('DOMContentLoaded', startVisualization);
