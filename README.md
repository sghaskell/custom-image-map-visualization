# Splunk Custom Visualization

# Synopsis
Custom image map visualization to plot x,y coordinates in pixels on a flat image using Leaflet Maps.

Have you ever wanted to map people in a building or retail space and trace their path across the store? Are you looking to plot gaming data on a custom game map? If you have an image, data and can convert or specify coordinates in x,y, use this custom visualization!

# Credits
### Included Open Source Software
##### [Leaflet Maps](http://leafletjs.com/)
##### [Leaflet Awesome Markers Plugin](https://www.npmjs.com/package/drmonty-leaflet-awesome-markers)
##### [Leaflet.Coordinates Plugin](https://github.com/MrMufflon/Leaflet.Coordinates)
##### [togeojson](https://github.com/mapbox/togeojson)
##### [JSZip](https://stuk.github.io/jszip/)
##### [JSZipUtils](http://stuk.github.io/jszip-utils/)
##### [Jquery](https://jquery.com/)
##### [Underscore.js](http://underscorejs.org/)
##### [Webpack](https://webpack.github.io/)
##### [transform-loader](https://www.npmjs.com/package/transform-loader)
##### [brfs](https://www.npmjs.com/package/brfs)

Big thanks to **Andrew Stein** for all the feature requests, extensive testing and contribution to the docs.

# Compatibility
This app only works with **Splunk 6.4+** as it relies on the new [Custom Visualization API](http://docs.splunk.com/Documentation/Splunk/latest/AdvancedDev/CustomVizDevOverview).

# X,Y Coordinate Primer
When a custom image is loaded as a map, the X and Y range corresponding to the image are centered on the bottom left corner, X,Y = (0,0)
 
As we move across the bottom of the image, the number of pixels across becomes the X measurement. So the right bottom corner is X,Y=(ImagePixelWidth,0)
 
As we move up the left side  of the image, the number of pixels high becomes the Y measurement. So the right upper corner is X,Y=( ImagePixelWidth, ImagePixelHeigth)
 
You can place markers outside of an image’s maximum X,Y as the canvas for the app extends beyond these limits depending on your configurations.
 
When you adjust the pixel height and width in the format menu, you are **NOT** changing the X,Y mapping to image pixel height – you are adding additional “space” on the edges of the image file.
 
When mapping X and Y to the custom map image, you will want to “scale” your coordinates to the pixel size scale, using the 0,0 point on the custom map as a reference.
 
Consider the following example converstion :  Given an image 755 pixels high (Y)and 716 pixels wide (X), you can convert the x,y placement to the new scale with simple division
 
``| eval newy=round((y*755 )/100,0), newx=round((x*716 )/100,0)``
 
Where newy and newx are then put into the same field for the map viz
``| eval coordinates=newy.",".newx``
 
More advanced use cases require triangulation calculations and spatial geometry. Please see the following links:

[GPS To Coordinate Plane](http://stackoverflow.com/questions/3588653/convert-gps-coordinates-to-coordinate-plane)

[Equirectangular Projection](https://en.wikipedia.org/wiki/Equirectangular_projection)

# Usage
### Fields must be named exactly as labled here. The app is keyed off of field names and not field order.
`base_search | table coordinates, description [ title | icon | markerColor | iconColor | prefix | extraClasses | maxAge | pathWeight | pathOpacity]`

# Required Fields

##### coordinates
comma separated field of coordinates in y,x format. If coordinate fields are named `x` and `y` use eval to combine; `| eval coordinates=y.",".x`

##### description
Unique identifier for marker. Field is displayed in a pop-up when then marker is clicked on the map. You can get creative with this field. Combine a bunch of other fields or lookups using eval to make the description full of detail. **This field supports HTML**.

# Optional Fields
##### maxAge
Time in seconds for age of marker in a real-time search. If a new event for the marker has not been seen within this time range, the marker and path will be removed from the map. **Only use with real-time search, not static time ranges** 

# Style Markers And Icons Dynamically Through SPL
### Feature Description
The visualization allows you to dynamically style map markers and add icons via SPL. Create fields using [eval](http://docs.splunk.com/Documentation/Splunk/6.4.0/SearchReference/CommonEvalFunctions) to define colors for the marker or use an icon from [Font Awesome](http://fortawesome.github.io/Font-Awesome/icons/) or [ionicons](http://ionicons.com/). If you find the color set of icons too limiting, feel free to override the map marker icon with a map icon from Font Awesome and style it with any hex color or RGB value.
### Available Fields and Values
##### title
Icon mouse hover over description.
##### icon
Icon displayed in map marker - Any icon from [Font Awesome](http://fortawesome.github.io/Font-Awesome/icons/) or [ionicons](http://ionicons.com/). **Default** circle
##### markerColor
Color of map marker - red, darkred, lightred, orange, beige, green, darkgreen, lightgreen, blue, darkblue, lightblue, purple, darkpurple, pink, cadetblue, white, gray, lightgray, black. **Default** blue
##### iconColor
Color of icon - Any [CSS color name](https://www.vogatek.com/html-tutorials/cssref/css_colornames.asp.html), [Hex or RGB value](http://www.w3schools.com/colors/colors_picker.asp). **Default** white.
##### prefix
'fa' for Font Awesome or 'ion' for ionicons. **Default** 'fa'
##### extraClasses
Any extra CSS classes you wish to add for styling. Here are some [additional classes](http://fortawesome.github.io/Font-Awesome/examples/) you can use with Font Awesome to change the styling.
##### pathWeight
Weight (width) of path if **Show Path** setting is enabled
##### pathOpacity
Opacity of path line if **Show Path** setting is enabled

# Drilldown
The visualization will identify any non-standard fields and make them available as drilldown fields if the **Drilldown** setting is enabled. Simply add any fields you wish to the final table command and you'll have access to them via drilldown in Simple XML. See the [documentation on dynamic drilldown](http://docs.splunk.com/Documentation/Splunk/6.5.1/Viz/Dynamicdrilldownindashboardsandforms). Refer to this section of the docs on [accessing tokens for dynamic drilldown](http://docs.splunk.com/Documentation/Splunk/latest/Viz/tokens#Define_tokens_for_dynamic_drilldown).

### Usage
Drilldown is disabled by default. Enable it in the main **Map** section of the format menu.  Simply **double-click** on a marker to activate the drilldown behavior.

# Overlays
If you have existing KML/KMZ files that define features (polyline, polygons, whatever) you can now leverage them to overlay these features on the map.

#### Usage

##### KML/KMZ Overlay
Copy any KML or KMZ files into the following directory

```$SPLUNK_HOME/etc/apps/retial-map-viz/appserver/static/visualizations/map_viz/contrib/kml```

If you use a deployer (search head clustering) or a deployment server to manage your search heads, uncompress the app and place your KML files into the above directory and then recompress the app for distribution. 

Click 'Format' and selct the 'Overlays' tab. Enter a comma separated list of filenames that you uploaded to the above directory.

```file1.kml,file2.kmz```

The files will be asynchronously loaded when the map is rendered.

# Search Examples

```
index=demo
|eval s1signal=if(like(MERCHANTID,"%s1"),s,"")
|eval s2signal=if(like(MERCHANTID,"%s2"),s,"")
|eval s2signal=abs(s2signal)
|eval s1signal=abs(s1signal)
| stats min(s1signal) as mins1signal min(s2signal) as mins2signal values(state) by _time, MAC
| streamstats window=3 avg(mins1signal) as avgs1signal avg(mins2signal) as avgs2signal by MAC
| eval s1_distance = (80-avgs1signal) *50/40
| eval s2_distance=(80-avgs2signal)*50/40
| eval d=29.2
| eval l= (pow(s1_distance,2)-pow(s2_distance,2)+ pow(d,2))/(2*d)
| eval h= sqrt(abs(pow(s1_distance,2)-pow(l,2)))
| eval x=l/d*(50-50)+h/d*(41.6-70.8)+50
| eval y=l/d*(41.6-70.8)+h/d*(50-50)+70.8
| eval newy=(y*755 )/100, newx=(x*716 )/100, coordinates=newy.",".newx,description=MAC,pathWeight=10,pathOpacity=0.5,iconColor="#ff33dd",title=description,maxAge=5000000,icon="user-circle-o"
| search coordinates=*
| table _time,description,coordinates,MAC,pathWeight,pathOpacity,title,maxAge,icon
```

# Formatting Options
### Map
###### Map Image
Copy an image file to `$SPLUNK_HOME/etc/apps/custom-image-map-viz/appserver/static/visualizations/map_viz/contrib/images` and reference that image file name in this field. 
###### Map Height
Specify the height of your image in pixels. **REQUIRED**
###### Map Width
Specify the width of your image in pixels. **REQUIRED**
###### Scroll Wheel Zoom
Enable or disable scroll wheel zoom.
###### Full Screen Mode
Enable or disable full screen mode. Map takes up all available space in browser and adjust to resize. - **Requires browser Refresh**
###### Drilldown
Enable or disable drilldown. Double click a marker to activate drilldown. - **Requires browser Refresh**
###### Pointer Coordinates
Enable or disable display pane showing x,y coordinates of mouse pointer within image.
###### Default Height
Initial Height Of Map (Default: 600)
###### Background Color
Background color of container for images that don't fill the entire panel (Default: #ddd)
###### Map Zoom
Initial Zoom for map (Default: 0)
###### Center X
Initial Center Latitiude (Default: 0)
###### Center Y
Initial Center Longitude (Default: 0)
###### Min Zoom
Minimum zoom for tile layer. Does not affect map zoom. (Default: 0)
###### Max Zoom
Maximum zoom for tile layer. Does not affect map zoom. (Default: 0)

### Markers
###### Show Path
Enable or disable the path for a given marker.
###### Show All Popups
Display all popups on page load. Only works with clustering disabled. - **Requires browser Refresh**
###### Allow Multiple Popups
Allow multiple popups to dispaly on screen without closing previous. Will disappear at higher zoom levels with clustering enabled. Enabled by default when showing all popups. - **Requires browser Refresh**
###### Focus Clicked
When a marker or path is clicked, bring focus by setting the opacity of all unclicked markers/paths to the **Unfocused Opacity** setting. All markers have equal visibility when no marker or path is clicked. (Default: Yes)
###### Unfocused Opacity
Opacity of markers and paths that are unfocused. Floating point number between 0 (hidden) and 1 (solid) - (Default: 0.1)

### Overlays
#### Layer control changes require browser refresh
###### KML/KMZ Overlay
Comma separated list of KML or KMZ file names copied into kml directory of app (file1.kml, file2.kml)



# Support
This app is supported by Scott Haskell ([shaskell@splunk.com](mailto:shaskell@splunk.com))
