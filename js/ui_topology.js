var ui_topo;

function topology_ui_init(topoData) {
  var app = new nx.ui.Application();

  nx.define('MyNodeToolTip', nx.ui.Component, {
    properties: {
      node: {},
      topology: {}
    },
    view: {
      content: [
        { tag: 'div', props: { class: "n-topology-tooltip-header"}, content: '{#node.name}'},
    
        { tag: 'div', props: { class: "n-topology-tooltip-content"}, content: [
          {tag:'label', content: 'IPv4 Router ID'},
          {tag:'span', content: '{#node.ipv4_id}'},
          ]
        },
        { tag: 'div', props: { class: "n-topology-tooltip-content"}, content: [
          {tag:'label', content: 'ASN'},
          {tag:'span', content: '{#node.ipv4_id}'},
          ]
        
        },
      ]
    }
  });
  content= [
    { tag: 'div', props: { class: "n-topology-tooltip-header"}, content: '{#node.model.name}'},

    { tag: 'div', props: { class: "n-topology-tooltip-content"}, content: [
      {tag:'label', content: 'IPv4 Router ID'},
      {tag:'span', content: '{#node.ipv4_id}'},
      ]
    },
    { tag: 'div', props: { class: "n-topology-tooltip-content"}, content: [
      {tag:'label', content: 'ASN'},
      {tag:'span', content: '{#node.ipv4_id}'},
      ]
    
    },
  ];
  nx.define('MyLinkTooltip', nx.ui.Component, {
    properties: {
        link: {},
        topology: {}
    },
    view: {
        content: [
        { tag: 'div', props: { class: "n-topology-tooltip-header"}, content: '{#link.model.link_id.local_ipv4}'},
        
        { tag: 'div', props: { class: "n-topology-tooltip-content"}, content: [
            {tag:'label', content: 'IGP metric'},
            {tag: 'span', content: ' {#link.model.igp_metric}'},
            ]
        },
        { tag: 'div', props: { class: "n-topology-tooltip-content"}, content: [
            {tag:'label', content: 'TE Metric'},
            {tag: 'span', content: ' {#link.te_metric}'},
            ]
        }
        ]
    }
  });

  nx.define('MyLink', nx.graphic.Topology.Link, {
    properties: {
        sourcelabel: null,
        targetlabel: null,
        hidden: 0
    },
    view: function(view) {
        view.content.push({
            name: 'source',
            type: 'nx.graphic.Text',
            props: {
                'class': 'sourcelabel',
                'alignment-baseline': 'text-after-edge',
                'text-anchor': 'start'
            }
        }, {
            name: 'target',
            type: 'nx.graphic.Text',
            props: {
                'class': 'targetlabel',
                'alignment-baseline': 'text-after-edge',
                'text-anchor': 'end'
            }
        }
        );
        
        return view;
    },
    methods: {
        update: function() {
            this.visible(!this.hidden());

            this.inherited();
            
            
            var el, point;
            
            var line = this.line();
            var angle = line.angle();
            var stageScale = this.stageScale();
            
            // pad line
            line = line.pad(18 * stageScale, 18 * stageScale);
            
            if (this.sourcelabel()) {
                el = this.view('source');
                point = line.start;
                el.set('x', point.x);
                el.set('y', point.y-2);
                el.set('text', this.sourcelabel());
                el.set('transform', 'rotate(' + angle + ' ' + point.x + ',' + point.y + ')');
                el.setStyle('font-size', 10 * stageScale);
            }
            
            
            if (this.targetlabel()) {
                el = this.view('target');
                point = line.end;
                el.set('x', point.x);
                el.set('y', point.y-2);
                el.set('text', this.targetlabel());
                el.set('transform', 'rotate(' + angle + ' ' + point.x + ',' + point.y + ')');
                el.setStyle('font-size', 10 * stageScale);
            }
        }
    }
});

  var topoConfig = {
    adaptive: true,
    autoLayout: true,
    enableSmartNode: true,
    enableSmartLabel: true,
    supportMultipleLink: true,
    height: 1000,
    tooltipManagerConfig: {
      nodeTooltipContentClass: "MyNodeTooltip",
      linkTooltipContentClass: "MyLinkTooltip"
    },
    "nodeConfig": {
      "label":"model.name",
      "iconType": "router",
      "color": 'model.color'
    },
    "linkConfig": {
      "linkType": "curve"
    },
    linkInstanceClass: "MyLink",
    nodeSetConfig: {
      iconType: 'cloud',
      color: 'model.color'
    },
    "showIcon": true,
    "dataProcessor": "force",
    vertexPositionGetter: function() {
      // if this is node, use original position
      if (this.type() == "vertex") {
        return {
          x: nx.path(this._data, 'x') || 0,
          y: nx.path(this._data, 'y') || 0
        };
      } else {
        // if this is a nodeSet, use the firNode's position
        var graph = this.graph();
        var firstVertex = graph.getVertex(this.get('nodes').slice(0).shift());

        if (firstVertex) {
          return firstVertex.position();
        } else {
          return {
            x: Math.random() * 500,
            y: Math.random() * 500
          }
        }
      }
    },
    vertexPositionSetter: function(position) {
      if (this._data) {
        var x = nx.path(this._data, 'x');
        var y = nx.path(this._data, 'y');
        if (position.x !== x || position.y !== y) {
          nx.path(this._data, 'x', position.x);
          nx.path(this._data, 'y', position.y);
          return true;
        } else {
          return false;
        }
      }
    },
  };


  ui_topo = new nx.graphic.Topology(topoConfig);

  ui_topo.data(topoData);

  app.container(document.getElementById("topocontainer"));

  ui_topo.attach(app);
  console.log(ui_topo);
  console.log(ui_topo.getLayer('nodeSet'));
  console.log(ui_topo.getLayer('nodeSet').getNodeSet(10));

}

function topology_ui_refresh(topoData) {
  ui_topo.data(topoData);
  console.log(ui_topo);
}

/*
      (function(nx) {
        var app = new nx.ui.Application();
        console.log(app);
        var topoConfig = {
          "nodeConfig": {
            "label":"model.id",
            "iconType": "router"
          },
          "linkConfig": {
            "linkType": "curve"
          },
          "showIcon": true,
          "dataProcessor": "force"
        };

        var topo = new nx.graphic.Topology(topoConfig);

        topo.data(topologyData);
        console.log(topo);
        //
        console.log(document.getElementById("topocontainer"));
        app.container(document.getElementById("topocontainer"));
        topo.attach(app);
      })(nx);
*/