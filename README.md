# Spotify Music Trends Visualization

This is my narrative visualization project for my data visualization class. I built this using D3.js to explore Spotify music data and show how music has changed over time.

## What This Project Does

I created an interactive slideshow that lets you explore different parts of Spotify music data:

1. **Overview** - Shows basic stats like total tracks and average popularity
2. **Genre Timeline** - Shows which genres were popular in different decades
3. **Danceability vs Energy** - A scatter plot showing how danceable and energetic songs are
4. **Artist Analysis** - Shows the most popular artists based on their track popularity


## What Data You Need

My CSV file has these columns and it represents the spotify data:
- `name_track` - The song name
- `popularity_track` - How popular the track is (0-100)
- `name_artist` - The artist name
- `popularity_artist` - How popular the artist is (0-100)
- `genres` - List of genres (stored as JSON)
- `release_date` - When the song came out (YYYY-MM-DD)
- `danceability` - How danceable the song is (0-1)
- `energy` - How energetic the song is (0-1)

## How I Built This

### Scenes
I made 4 different scenes that each show something different about the data:
- Scene 1: Just shows some basic numbers to get started
- Scene 2: A chart showing genres over time
- Scene 3: A scatter plot of danceability vs energy
- Scene 4: A bar chart of the most popular artists

### Annotations
I added green boxes that pulse to tell users what they can do. I also made tooltips that show up when you hover over things.

### Parameters
I used variables to keep track of:
- Which scene is showing right now
- What genre the user picked (if any)
- The data itself

### Triggers
I made buttons to switch between scenes, and made charts interactive so you can click and hover on things.

## Design Choices

- Used Spotify's green color (#1db954) to match their brand
- Made it work on phones and computers
- Added smooth animations when switching scenes
- Used clear fonts and colors

