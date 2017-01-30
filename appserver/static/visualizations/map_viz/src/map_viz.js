define([
            'jquery',
            'underscore',
            'leaflet',
            'togeojson',
            'jszip',
            'jszip-utils',
            'vizapi/SplunkVisualizationBase',
            'vizapi/SplunkVisualizationUtils',
            'drmonty-leaflet-awesome-markers'
        ],
        function(
            $,
            _,
            L,
            toGeoJSON,
            JSZip,
            JSZipUtils,
            SplunkVisualizationBase,
            SplunkVisualizationUtils
        ) {

    return SplunkVisualizationBase.extend({
        contribUri: '/en-US/static/app/retail-map-viz/visualizations/map_viz/contrib/',
        defaultConfig:  {
            'display.visualizations.custom.retail-map-viz.map_viz.allPopups': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.multiplePopups': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.scrollWheelZoom': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.fullScreen': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.drilldown': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.defaultHeight': 600,
            'display.visualizations.custom.retail-map-viz.map_viz.mapCenterZoom': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.mapCenterX': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.mapCenterY': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.minZoom': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.maxZoom': 0,
            'display.visualizations.custom.retail-map-viz.map_viz.showPath': 1,
            'display.visualizations.custom.retail-map-viz.map_viz.focusClicked': 1,
            'display.visualizations.custom.retail-map-viz.map_viz.unfocusedOpacity': 0.1
        },
        peeps: {},
		iconColors: [],
		clickedPeeps: [],
		isFocused: false,

		// Peep object used to represent a user on the map
		peep: function(description,
					   currentPos,
					   lastSeen,
					   maxAge,
					   iconColor,
					   markerColor,
					   icon,
					   prefix,
					   extraClasses,
					   unfocusedOpacity,
					   pathOpacity,
					   that) {

			this.genIconColor = function () {
				var icolor = "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});
				if($.inArray(icolor, that.iconColors) === -1) {
					that.iconColors.push(icolor);
					return icolor;
				} else {
					console.log("Found dupe icon color. Re-generating");
					this.genIconColor();
				}
			};

			this.dimMarker = function () {
				this.marker.setOpacity(this.unfocusedOpacity);
			};

			this.unDimMarker = function () {
				this.marker.setOpacity(1.0);
			};

			this.dimPath = function () {
				if(this.path) {
					this.path.setStyle({opacity: this.unfocusedOpacity});
				}
			};

			this.unDimPath = function () {
				if(this.path) {
					this.path.setStyle({opacity: this.pathOpacity});
				}
			};

			// Used to determine whether to remove peep from map
			this.isAgedOut = function() {
				var dt1 = new Date();
				var dt2 = new Date(this.lastSeen);
				var diff = Math.abs(dt1-dt2);
				if(diff > this.maxAge) {
					console.log("Removing " + this.description);
					return true;
				} else {
					return false;
				}
			};

			if(iconColor) {
				this.iconColor = iconColor;
			} else {
				this.iconColor = this.genIconColor();
			}

			// Assign values
			this.description = description;
			this.currentPos = currentPos;
			this.coordinates = [];
			this.coordinates.push(currentPos);

			// Create marker icon
			this.markerIcon = L.AwesomeMarkers.icon({prefix: prefix,
													 markerColor: markerColor,
													 icon: icon,
													 extraClasses: extraClasses,
													 iconColor: this.iconColor});
			// Init layerGroup for this peep
			this.layerGroup= L.layerGroup();
			this.lastSeen = lastSeen;
			this.marker = null;
			this.path = null;
			this.drilldownFields = null;
			this.maxAge = maxAge;
			this.isClicked = false;
			this.pathOpacity = pathOpacity;
			this.unfocusedOpacity = unfocusedOpacity;
		},

		// Used to check mapHeight and mapWidth and throw an error if the values are missing
		checkNan: function(val, field) {
			var error = 'Missing ' + field + ' - Please set in format menu';
			if(isNaN(val)) {
				 throw new SplunkVisualizationBase.VisualizationError(error);
			}
		},

        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.$el = $(this.el);
            this.isInitializedDom = false;
        },

        // Search data params
        getInitialDataParams: function() {
            return ({
                outputMode: SplunkVisualizationBase.RAW_OUTPUT_MODE,
                count: this.maxResults
            });
        },

        setupView: function() {
            this.clearMap = false;
        },

        // Build object of key/value paris for invalid fields
        // to be used as data for _drilldown action
        validateFields: function(obj) {
            var invalidFields = {};
            var validFields = ['_time','coordinates','title','description','icon','markerColor','iconColor','prefix','extraClasses','maxAge','pathWeight','pathOpacity'];
            $.each(obj, function(key, value) {
                if($.inArray(key, validFields) === -1) {
                    invalidFields[key] = value;
                }
            });

            return(invalidFields);
        },

        // Custom drilldown behavior for markers
        _drilldown: function(drilldownFields, resource) {
            payload = {
                action: SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN,
                data: drilldownFields
            };

            this.drilldown(payload);
        },

		_dimMarkers: function(p, obj) {
			console.log(p, obj);
			this.isFocused = true;
			p.isClicked = true;
			this.clickedPeeps.push(p.description);
			console.log(this.clickedPeeps);
			p.unDimMarker();
			p.unDimPath();

			_.each(this.peeps, function(peep, i) {
				if($.inArray(peep.description, this.clickedPeeps) === -1) {
					peep.dimMarker();
					peep.dimPath();
				}
			},this);
		},

		_unDimMarkers: function(p, obj) {
			console.log(p, obj);
			p.isClicked = false;
			this.clickedPeeps = _.without(this.clickedPeeps, p.description);
			console.log(this.clickedPeeps);

			if(this.clickedPeeps.length === 0) {
				this.isFocused = false;
				_.each(this.peeps, function(peep, i) {
					peep.unDimMarker();
					peep.unDimPath();
				},this);
			} else {
				p.dimMarker();
				p.dimPath();
			}
		},

        // Convert string '1/0' or 'true/false' to boolean true/false
        isArgTrue: function(arg) {
            if(arg === 1 || arg === 'true') {
                return true;
            } else {
                return false;
            }
        },
      
        // Fetch KMZ or KML files and add to map
        fetchKmlAndMap: function(url, file, map) {
            // Test if it's a kmz file
            if(/.*\.kmz/.test(file)) {
                JSZipUtils.getBinaryContent(url, function (e, d) {
                    var z = new JSZip();

                    z.loadAsync(d)
                    .then(function(zip) {
                        return zip.file(/.*\.kml/)[0].async("string");
                    })
                    .then(function (text) {
                        var kmlText = $.parseXML(text);
                        var geojson = toGeoJSON.kml(kmlText);

                        L.geoJson(geojson.features, {
                            style: function (feature) {
                                 return feature.properties.style;
                             },
                             onEachFeature: function (feature, layer) {
                                 layer.bindPopup(feature.properties.name);
                            }
                        }).addTo(map);
                    });
                });
            // it's a kml file
            } else {
                $.ajax({url: url, dataType: 'xml', context: this}).done(function(text) {
                    console.log(text);
                    var kmlText = $.parseXML(text);
                    //console.log(kmlText);
                    //var geojson = toGeoJSON.kml(kmlText);
                    var geojson = toGeoJSON.kml(text);
                    console.log(geojson)

                    L.geoJson(geojson.features, {
                        style: function (feature) {
                             return feature.properties.style;
                         },
                         onEachFeature: function (feature, layer) {
                             layer.bindPopup(feature.properties.name);
                        }
                    }).addTo(map);
                });
            }
        },

        // Do the work of creating the viz
        updateView: function(data, config) {
            // viz gets passed empty config until you click the 'format' dropdown
            // intialize with defaults
            if(_.isEmpty(config)) {
                config = this.defaultConfig;
            }

            // get data
            var dataRows = data.results;
            //console.log(dataRows);

            // check for data
            if (!dataRows || dataRows.length === 0 || dataRows[0].length === 0) {
                return this;
            }

            // Validate we have at least latitude and longitude fields
            if(!("coordinates" in dataRows[0]) || !("description" in dataRows[0])) {
                 throw new SplunkVisualizationBase.VisualizationError(
                    'Incorrect Fields Detected - description & coordinates fields required'
                );
            }

            // get configs
            var mapImage = SplunkVisualizationUtils.makeSafeUrl(config['display.visualizations.custom.retail-map-viz.map_viz.mapImage']),
                mapHeight = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.mapHeight']),
                mapWidth = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.mapWidth']),
                allPopups   = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.allPopups']),
                multiplePopups = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.multiplePopups']),
                scrollWheelZoom = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.scrollWheelZoom']),
                fullScreen = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.fullScreen']),
                drilldown = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.drilldown']),
                defaultHeight = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.defaultHeight']),
                mapCenterZoom = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.mapCenterZoom']),
                mapCenterX = parseFloat(config['display.visualizations.custom.retail-map-viz.map_viz.mapCenterX']),
                mapCenterY = parseFloat(config['display.visualizations.custom.retail-map-viz.map_viz.mapCenterY']),
                minZoom     = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.minZoom']),
                maxZoom     = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.maxZoom']),
                kmlOverlay  = config['display.visualizations.custom.retail-map-viz.map_viz.kmlOverlay'],
                showPath = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.showPath'])
                focusClicked = parseInt(config['display.visualizations.custom.retail-map-viz.map_viz.focusClicked'])
                unfocusedOpacity = parseFloat(config['display.visualizations.custom.retail-map-viz.map_viz.unfocusedOpacity'])

            this.checkNan(mapHeight, "Map Height");
            this.checkNan(mapWidth, "Map Width");

            // Initialize the DOM
            if (!this.isInitializedDom) {
                // Set defaul icon image path
                L.Icon.Default.imagePath = location.origin + this.contribUri + 'images';
                var activeImage = location.origin + this.contribUri + 'images/' + mapImage;

                // Enable all or multiple popups
                if(this.isArgTrue(allPopups) || this.isArgTrue(multiplePopups)) {
                    L.Map = L.Map.extend({
                        openPopup: function (popup, latlng, options) {
                            if (!(popup instanceof L.Popup)) {
                                popup = new L.Popup(options).setContent(popup);
                            }

                            if (latlng) {
                                popup.setLatLng(latlng);
                            }

                            if (this.hasLayer(popup)) {
                                return this;
                            }

                            this._popup = popup;
                            return this.addLayer(popup);
                        }
                    });

                    var map = this.map = new L.Map(this.el, {
                        closePopupOnClick: false,
                        minZoom: minZoom,
                        maxZoom: maxZoom,
                        center: [mapCenterY,mapCenterX],
                        zoom: 0,
                        crs: L.CRS.Simple,
                    });
                } else {
                    var map = this.map = new L.Map(this.el, {
                        minZoom: minZoom,
                        maxZoom: maxZoom,
                        center: [mapCenterY,mapCenterX],
                        zoom: 0,
                        crs: L.CRS.Simple,
                    });
                }


                // dimensions of the image
                var w = mapWidth;
                var h = mapHeight;
				
				// Set bounds and create image overlay
                var bounds = [[0,w], [h,0]];
                var overlay = L.imageOverlay(activeImage, bounds);

                // tell leaflet that the map is exactly as big as the image
                map.setMaxBounds(bounds); 
                map.fitBounds(bounds); 

				// Add overlay to map
                this.map.addLayer(overlay);

                // Get parent element of div to resize
                var parentEl = $(this.el).parent().parent().closest("div").attr("data-cid");

                // Map Full Screen Mode
                if (this.isArgTrue(fullScreen)) {
                    var vh = $(window).height() - 120;
                    $("div[data-cid=" + parentEl + "]").css("height", vh);

                    $(window).resize(function() {
                        var vh = $(window).height() - 120;
                        $("div[data-cid=" + parentEl + "]").css("height", vh);
                    });
                    this.map.invalidateSize();
                } else {
                    $("div[data-cid=" + parentEl + "]").css("height", defaultHeight);
                    this.map.invalidateSize();
                }


                // Iterate through KML files and load overlays into layers on map 
                if(kmlOverlay) {
                    // Create array of kml/kmz files
                    var kmlFiles = kmlOverlay.split(/\s*,\s*/);

                    // Loop through each file and load it onto the map
                    _.each(kmlFiles, function(file, i) {
                        var url = location.origin + this.contribUri + 'kml/' + file;
                        this.fetchKmlAndMap(url, file, this.map);
                    }, this);
                }
               
                // Init defaults
                this.chunk = 50000;
                this.offset = 0;
                this.isInitializedDom = true;         
            } 

            // BEGIN PROCESSING DATA
            // Iterate through data and build peeps object with peep instances
            _.each(dataRows, function(userData, i) {
                // Coordinates expected as single value Splunk field y,x
                var coordinates = userData["coordinates"].split(/,/).map(parseFloat);
                var latlng = L.latLng(coordinates);
                var description = userData["description"];
                var lastSeen = (_.has(userData, "_time")) ? userData["_time"]:new Date();
                var maxAge = (_.has(userData, "maxAge")) ? userData["maxAge"]*1000:null;
                var pathWeight = (_.has(userData, "pathWeight")) ? userData["pathWeight"]:5;
                var pathOpacity = (_.has(userData, "pathOpacity")) ? userData["pathOpacity"]:0.5;
                var iconColor = (_.has(userData, "iconColor")) ? userData["iconColor"]:null;
                var markerColor = (_.has(userData, "markerColor")) ? userData["markerColor"]:"blue";
                var icon = (_.has(userData, "icon")) ? userData["icon"]:"circle";
                var prefix = (_.has(userData, "prefix")) ? userData["prefix"]:"fa";
                var extraClasses = (_.has(userData, "extraClasses")) ? userData["extraClasses"]:"fa-lg";
                var title = (_.has(userData, "title")) ? userData["title"]:null;

				// Peep exists. Update with latest values
                if(_.has(this.peeps, description)) {
                    this.peeps[description].currentPos = latlng;
                    this.peeps[description].coordinates.push(latlng);
                    this.peeps[description].lastSeen= lastSeen;
                } else {
					// Create a new peep
                    console.log("creating " + description);
                    var thisPeep = new this.peep(description,
											     latlng,
												 lastSeen,
												 maxAge,
												 iconColor,
												 markerColor,
											 	 icon,
												 prefix,
												 extraClasses,
												 unfocusedOpacity,
												 pathOpacity,
												 this);
                    thisPeep.pathWeight = pathWeight;
                    thisPeep.title = title;

                    // Add drilldown field/values
                    if (this.isArgTrue(drilldown)) {
                        var drilldownFields = this.validateFields(userData);
                        thisPeep.drilldownFields = drilldownFields;
                    }
                    this.peeps[description] = thisPeep;
                }
            }, this);            

			// Iterate through peep objects and plot markers/paths
			_.each(this.peeps, function(peep, i) {
				// Check age of marker and remove from map
				if(peep.maxAge) {
					if(peep.isAgedOut()) {
						peep.layerGroup.clearLayers();
						this.iconColors = _.without(this.iconColors, peep.iconColor);
						delete this.peeps[i];
					}
				}

				// marker exists, update with latest position
				if(peep.marker) {
					peep.marker.setLatLng(peep.currentPos).update();
				} else {
					// Add peeps marker to its layer group and stick on the map
					peep.layerGroup.addTo(this.map);
					if(this.isArgTrue(allPopups)) {
						peep.marker = L.marker(peep.currentPos, {icon: peep.markerIcon, title: peep.title}).bindPopup(peep.description).openPopup();
					} else {
						peep.marker = L.marker(peep.currentPos, {icon: peep.markerIcon, title: peep.title}).bindPopup(peep.description);
					}
					peep.marker.addTo(peep.layerGroup);

					if(this.isArgTrue(focusClicked)) {
						peep.marker.on('popupopen', this._dimMarkers.bind(this, peep));
						peep.marker.on('popupclose', this._unDimMarkers.bind(this, peep));
					}

					// Bind drilldown if enabled
					if (this.isArgTrue(drilldown)) {
						peep.marker.on('dblclick', this._drilldown.bind(this, peep.drilldownFields));
					}
				}
				if(this.isArgTrue(showPath)) {
					if(peep.path) {
						// update the path coordinates
						peep.path.setLatLngs(peep.coordinates);
					} else {
						// Add path to peeps layerGroup and draw on the map
						peep.path = L.polyline(peep.coordinates,
												{weight: peep.pathWeight,
												 opacity: peep.pathOpacity,
												 color: peep.iconColor}
											  )
											  .addTo(peep.layerGroup)
											  .bindPopup(peep.description, {closeOnClick: false});
						if(this.isArgTrue(focusClicked)) {
							peep.path.on('popupopen', this._dimMarkers.bind(this, peep));
							peep.path.on('popupclose', this._unDimMarkers.bind(this, peep));
						}
					}
				}

				// Currently focused, dim marker and path
				if(this.isFocused && !peep.isClicked) {
					peep.dimMarker();
					peep.dimPath();
				}

			}, this);
            // END PROCESSING DATA

            // Chunk through data 50k results at a time
            if(dataRows.length === this.chunk) {
                this.offset += this.chunk;
                this.updateDataParams({count: this.chunk, offset: this.offset});
            } else {
                this.offset = 0; // reset offset
                this.updateDataParams({count: this.chunk, offset: this.offset}); // update data params
            }

            return this;
        }
    });
});
