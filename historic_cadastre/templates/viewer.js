Ext.onReady(function() {

    if ('${plan_largeur}' === 'None') {
        Ext.get('loading').remove();
        Ext.fly('loading-mask').fadeOut({
            remove: true
        });
        Ext.get('no-image').setVisible(true);
        return;
    }

    // Ext global settings
    Ext.BLANK_IMAGE_URL = "${request.static_url('historic_cadastre:static/lib/ext/resources/images/default/s.gif')}";
    Ext.QuickTips.init();

   // OpenLayers global settings
    OpenLayers.Number.thousandsSeparator = ' ';
    OpenLayers.IMAGE_RELOAD_ATTEMPTS = 5;
    OpenLayers.DOTS_PER_INCH = 72;
    OpenLayers.ImgPath = "${request.static_url('historic_cadastre:static/images/ol/')}";
    OpenLayers.Lang.setCode("fr");
    // GeoExt global settings
    GeoExt.Lang.set("fr");

    var scales = [100, 250, 500, 1000, 2000, 2500, 5000, 10000];

% if echelle:
    // Determine zoom level
    var zoom;
    if (scales.indexOf(${echelle}) == -1) {
        zoom = 4;
    } else {
        zoom = scales.indexOf(${echelle});
        zoom = scales.length - 1 - zoom;
    }
% else:
    var zoom = 4;
% endif

    var map = new OpenLayers.Map({
        theme: null,
        units: "m",
        projection: "EPSG:21781",
        maxExtent: [-10000,-10000,10000,10000],
        center: new OpenLayers.LonLat(0, 0),
        scales: scales,
        controls: [
            new OpenLayers.Control.Navigation({
                dragPanOptions: {enableKinetic: true}
            }),
            new OpenLayers.Control.PanZoomBar({panIcons: false}),
            new OpenLayers.Control.ScaleLine({
                geodesic: true,
                bottomInUnits: false,
                bottomOutUnits: false
            })
        ]
    });

    // IMAGE SECTION //
    // Define the bounds (we place the 0, 0 coordinates in the middle of the image.)
    var xmin = - Math.ceil(${plan_largeur}/2);
    var ymin = - Math.ceil(${plan_hauteur}/2);
    var xmax = ${plan_largeur} + xmin;
    var ymax = ${plan_hauteur} + ymin;
    xmin = xmin * ${plan_resolution};
    ymin = ymin * ${plan_resolution};
    xmax = xmax * ${plan_resolution};
    ymax = ymax * ${plan_resolution};

    // Check if it is actually defined....

    var img_size = new OpenLayers.Size(${plan_largeur},${plan_hauteur});

    if (img_size.w == 0 && img_size.h == 0) {
        new Ext.Window({
            title: 'Image non-disponible',
            resizable: false,
            modal: true,
            closable: false,
            width: 400,
            height: 200,
            bodyStyle: 'padding: 5px;',
            html: [
                '<h1>Information</h1>',
                '<br /><br />',
                '<p>Cette image n\'est malheureusement pas disponible.</p>'
            ].join('')
        }).show();
    }

    var image_layer = new OpenLayers.Layer.Image(
        'the_image',
        '${plan_url}',
        new  OpenLayers.Bounds(xmin, ymin, xmax, ymax),
        img_size
    );

    map.addLayer(image_layer);

    var bbar = new Ext.Toolbar({
        cls: 'map-toolbar',
        items: [{
            xtype: 'tbtext',
            text: [
                'Information dépourvues de foi publique, &copy; ',
                'SGRF, ',
                'République et Canton de Neuchâtel'
            ].join('')
        },
        '-',
        {
            xtype: 'tbtext',
            text: [
                '<span style="color:red;font-weight:bold;">ATTENTION</span>:',
                ' ces plans ne sont pas orientés, le Nord ne se trouve pas ',
                'forcément en haut de la carte!'
            ].join('')
        },
        '->',
        {
            xtype: 'tbtext',
            id: 'scale_text'
        }]
    });

    // Show map Scale
    map.events.register('zoomend', this, function() {
        var scale = Math.round(map.getScale());
        var tbtext = Ext.getCmp('scale_text');
        tbtext.setText('Échelle: 1:'+scale);
    });

    // Ext & GeoExt
    var mapPanel = new GeoExt.MapPanel({
        stateId: "map",
        map: map,
        center: new OpenLayers.LonLat(0, 0),
        zoom: zoom,
        region: "center",
        tbar: new Ext.Toolbar({
            cls: 'map-toolbar'
        }),
        bbar: bbar
    });

    var tbar = mapPanel.getTopToolbar();

    tbar.addItem({
            xtype: 'tbtext',
% if type_plan:
    % if echelle:
            text: '<b>Cadastre</b>: ${nomcad} - <b>Plan</b> n° ${no_plan}, ${type_plan}, échelle de base 1:${echelle}',
    % else:
            text: '<b>Cadastre</b>: ${nomcad} - <b>Plan</b> n° ${no_plan}, ${type_plan}, échelle non-renseignée',
    % endif
% else:
    % if echelle:
            text: '<b>Cadastre</b>: ${nomcad} - <b>Plan</b> n° ${no_plan}, échelle de base 1:${echelle}',
    % else:
            text: '<b>Cadastre</b>: ${nomcad} - <b>Plan</b> n° ${no_plan}, échelle non-renseignée',
    % endif
% endif
            style: 'font-size:11.5px;'
    });
    tbar.addItem(' ');
    tbar.addItem('-');
    var id_measure = 'measure_text';
    tbar.addButton(historic_cadastre.Measure(mapPanel, id_measure));
    tbar.addItem('-');
    tbar.addItem({
        xtype: 'tbtext',
        id: id_measure,
        style: 'color:red;font-size:11.5px;font-weight:bold;'
    });
    // Add print Window
    tbar.addItem('->');
    tbar.addItem('-');
    
    var url = "${request.route_url('printproxy')}";
    var print_window;

% if nomcad:
    var options = {
        'cadastre': '${nomcad}'.trim(),
        'no_plan': '${no_plan}',
    % if echelle:
        'echelle': '${echelle}',
    % else:
        'echelle': 'échelle non-renseignée',
    % endif
    % if type_plan:
        'type_plan': '${type_plan}'
    % else:
        'type_plan': ''
    % endif
    };
% else:
    var option;
% endif

    tbar.addButton(
        new Ext.Button({
            iconCls: "print",
            text: 'Imprimer',
            tooltip: "Impression",
            enableToggle: true,
            listeners: {
                toggle: function(button) {
                    if (button.pressed) {
                        print_window = historic_cadastre.PrintWindow(button, mapPanel, url, options);
                        print_window.show();
                        print_window.anchorTo(GeoExt.MapPanel.guess().body, 'tr-tr', [0, -1]);
                    } else {
                        print_window.hide();
                    }
                }
            }
        })
    );

    var headerPanel = new Ext.Panel({
        region: 'north',
        height: 57,
        border: false,
        contentEl: 'header'
    });

    var viewport = new Ext.Viewport({
        layout: 'border',
        renderTo:'main',
        id:'viewPort',
        border:true,
        items: [
            headerPanel,
            mapPanel
        ]
    });

    // Refait la mise en page si la fenêtre change de taille
    //pass along browser window resize events to the panel
    Ext.EventManager.onWindowResize(viewport.doLayout, viewport);

    Ext.get('loading').remove();
    Ext.fly('loading-mask').fadeOut({
        remove: true
    });

});