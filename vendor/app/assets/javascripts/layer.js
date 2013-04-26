$(document).ready(function(){
  // Keep thie map variable
  var thisMap;

  addLegend = function(map, colorGroup) {
    if(colorGroup.length == 0 || (colorGroup.length == 1 && colorGroup[0] == [0, 0])) {
      return;
    }
    $('.legend-info').remove();
    var legend = L.control({position: 'bottomright'});

    legend.onAdd = function (map) {

      var div = L.DomUtil.create('div', 'legend-info legend'),
          grades = colorGroup,
          labels = [];

      // loop through our density intervals and generate a label with a colored square for each interval
      var innerHtml = '<table><tr><td><i style="background:#FFEFD0"></i></td><td>0</td></tr>'
      for (var i = 0; i < grades.length; i++) {
        innerHtml +=
          '<tr><td><i style="background:' + getColor(grades[i][1], colorGroup) + '"></i></td><td> ' +
          grades[i][0] + (grades[i][1] ? '&ndash;' + grades[i][1] : '+') +
          '</td></tr>';
      }
      innerHtml += '</table>';
      div.innerHTML = innerHtml;

      return div;
    };

    legend.addTo(map);
  }

  // Init the map including title layer and the legend
  init = function(map, colorGroup, layerGroup) {
    thisMap = map;
    // add a CloudMade tile layer with style #997
    var baseLayer = L.tileLayer('http://{s}.tile.cloudmade.com/42c6e747565540068a4bb4ad883f1f41/997/256/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
    });
    map.addLayer(baseLayer);

    // Layer control
    var baseMaps = {}
    var overlayMaps = {"Map Layer": baseLayer};
    for(var k in layerGroup["baseLayers"]){
      if (layerGroup["baseLayers"].hasOwnProperty(k)) {
        baseMaps[k] = layerGroup["baseLayers"][k];
        //map.addLayer(layerGroup["baseLayers"][k]);
      }
    }
    for(var k in layerGroup["overLayers"]){
      if (layerGroup["overLayers"].hasOwnProperty(k)) {
        overlayMaps[k] = layerGroup["overLayers"][k];
        map.addLayer(layerGroup["overLayers"][k]);
      }
    }
    //for(k in colsLayer){
    //  if(colsLayer.hasOwnProperty(k)){
    //    colsLayer[k].onAdd = function(t){
    //      if(t.hasLayer(layerGroup["overLayers"]["pointsLayer"])) {
    //        this._map = t;
    //        this.eachLayer(t.addLayer, t);
    //      }
    //    }
    //  }
    //}
    L.control.layers(baseMaps, overlayMaps).addTo(map);
    if(layerGroup["overLayers"].hasOwnProperty("Points Layer")){
      map.addLayer(layerGroup["overLayers"]["Points Layer"]);
      layerGroup["overLayers"]["Points Layer"].onAdd = function(map) {
        var checked = false;
        for(k in colsLayer){
          if(colsLayer.hasOwnProperty(k)) {
            checkedRadio = $('.leaflet-control-layers-base input:checked');
            checkedSpan = checkedRadio.closest('label').children('span');
            checkedText = checkedSpan.text().replace(/^\s+|\s+$/g, '');
            if (checkedText == k) {
              colsLayer[k]._map = map;
              colsLayer[k].eachLayer(map.addLayer, map);
              $('.attrs-panel').show();
              checked = true;
            }
          }
        }
        if(!checked) {
          this._map = map;
          this.eachLayer(map.addLayer, map);
        }
      }
      layerGroup["overLayers"]["Points Layer"].onRemove = function(map) {
        this.eachLayer(map.removeLayer, map);
        this._map = null;
        for(k in colsLayer){
          if(colsLayer.hasOwnProperty(k)) {
            colsLayer[k].eachLayer(map.removeLayer, map);
            colsLayer[k]._map = null;
          }
        }
        $('.attrs-panel').hide();
      }
    }

    if (layerGroup["overLayers"].hasOwnProperty("Polygon Layer")) {
      layerGroup["overLayers"]["Polygon Layer"].onAdd = function(map) {
        this._map = map;
        this.eachLayer(map.addLayer, map);
        $('.legend-info').show();
        for(k in colsLayer) {
          if (colsLayer.hasOwnProperty(k) && map.hasLayer(colsLayer[k])){
            colsLayer[k].bringToFront();
          }
        }
        //if(map.hasLayer(pointsLayer)) {
        //  pointsLayer.bringToFront();
        //}
      }

      layerGroup["overLayers"]["Polygon Layer"].onRemove = function(t) {
        this.eachLayer(t.removeLayer, t);
        this._map = null;
        $('.legend-info').hide();
      }
    }
    //layerGroup

    if(!colorGroup) return false;
    addLegend(map, colorGroup);

  };

  // An event listener for layer mouseover
  highlightFeature = function(e) {
    var layer = e.target;
    // No resetStyle method for polygon, so keep the origin style
    var options = null;
    options = layer._options ? layer._options : layer.options
    if(options) {
      layer.originStyle = options;

      layer.setStyle({
        weight: 4,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
      });
      if(options.fillColor == '#FFEFD0') {
        layer.setStyle({fillColor: '#123'});
      }
    }

    if (!L.Browser.ie && !L.Browser.opera) {
      layer.bringToFront();
    }
    layer.bringToBack();
  }

  // Listener for mouseout
  resetHighlight = function (e) {
    var layer = e.target
    //target.resetStyle(e.target);

    // Set style of tile layer to the origin style
    layer.setStyle(layer.originStyle);
  }

  // Listener for clicking event
  function zoomToFeature(e) {
    thisMap.fitBounds(e.target.getBounds());
  }

  //geojson = L.geoJson({}, {
  //  style: style,
  //        onEachFeature: onEachFeature
  //}).addTo(map);

  addArea = function(map, points, count, colorGroup) {
    var polyTile = null;
    if (Array.isArray(points[0][0])) {
      polyTile = L.multiPolygon(points, style(count, colorGroup)).addTo(map);
    } else {
      polyTile = L.polygon(points, style(count, colorGroup)).addTo(map);
    }

    // Binding listeners to every tile
    polyTile.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature
    });
    return polyTile;
  };

  getColorGroup = function(pointsCounts) {
    pointsCounts = pointsCounts.unique().sortBy(function(n){return parseInt(n)});
    var colorGroup = [], groupCount = 5, count = pointsCounts.length;

    function getGroupCount(c) {
      return c > 64 ? 8 :
             c > 49 ? 7 :
             c > 36 ? 6 :
             5 ;
    }

    if(count <= 5) {
      for(var i=0;i<count;i+=1) {
        if(pointsCounts)
          colorGroup.push([pointsCounts[i], pointsCounts[i]]);
      }
    } else {
      colorGroup.push([pointsCounts[0], pointsCounts[0]]);
      groupCount = getGroupCount(count);
      gradient = (pointsCounts[count - 2] - pointsCounts[1]) / (groupCount - 2);
      for(var i=1;i<count - 1;){
        var beginLimit = pointsCounts[i], endLimit = pointsCounts[i], j = 1;
        for(j=1;j<count-1-i;j++){
          if(pointsCounts[i+j]-pointsCounts[i] <= gradient) {
            endLimit = pointsCounts[i + j];
          } else {
            break;
          }
        }
        i += j;
        colorGroup.push([beginLimit, endLimit]);
      }
      colorGroup.push([pointsCounts[count  -1], pointsCounts[count - 1]]);
    }
    if (colorGroup.length < 1) {
      colorGroup = [[0, 0]]
    }
    return colorGroup;
  }

  // existedRows: the points showing in the map
  addPointsToColsLayer = function(existedRows){
    // k: name of cols header
    for(var k in colsLayer) {
      // attribute values of the col
      //var attrs = [];
      //$(existedRows).each(function(index){
      //  attrs.push(existedRows[index][k]);
      //});
      //attrs = attrs.unique();
      //// {ATTR_VALUE: randomColor, ...}
      //var attrColors = {};
      //$(attrs).each(function(index){
      //  //color = '#'+(function(h){return new Array(7-h.length).join("0")+h})((Math.random()*0x1000000<<0).toString(16));
      //  color = prettyColors[index % prettyColors.length];
      //  attrColors[attrs[index]] = color;
      //});
      //// {Cols_Name: attrColors}
      //colColors[k] = attrColors;
      for(var i=0;i < existedRows.length;i++){
        var lat = existedRows[i][lat_str];
        var lon = existedRows[i][lon_str];
        if(lat.match(/\d+\.\d+/) && lon.match(/\d+\.\d+/)) {
          var divNode = document.createElement('DIV');
          var info = "<table>";
          if (existedRows[i].hasOwnProperty('picture')) {
            info += '<tr><td colspan="2"><img src="https://formhub.s3.amazonaws.com/ossapmdgs/attachments/' + existedRows[i]['picture'].replace('.jpg', '-small.jpg') + '"></td></tr>';
          }
          for(var j in existedRows[i]) {
            if(existedRows[i].hasOwnProperty(j) && j != 'point') {
              info += "<tr><td>" + k + " : </td><td>" + existedRows[i][j] + "</td></tr>";
            }
          }
          info += "</table>";
          divNode.innerHTML = info;
          var point = L.circle([lat, lon], 300, {
            color: colColors[k][existedRows[i][k]],
                fillColor: colColors[k][existedRows[i][k]],
                fillOpacity: 1
          }).addTo(colsLayer[k]);
          if(!existedRows[i]['point']) {
            existedRows[i]['point'] = {};
          }
          point.bindPopup(info, {maxWidth: 1000});
          existedRows[i]['point'][k] = point;
        }
      }
    }
  }
});
