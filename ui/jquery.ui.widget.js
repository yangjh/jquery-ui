/*!
 * jQuery UI Widget @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Widget
 */
(function( $, undefined ) {

var slice = Array.prototype.slice;

///function rewrite $.cleanData
var _cleanData = $.cleanData;

$.cleanData = function( elems ) {
	for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
		$( elem ).triggerHandler( "remove" );
	}
	_cleanData( elems );
};

///base is optional parameter
///this basically means that you can specify two hierachies
$.widget = function( name, base, prototype ) {
	var namespace = name.split( "." )[ 0 ],
		fullName;
	name = name.split( "." )[ 1 ];
	fullName = namespace + "-" + name;

	///parameter shifting
	if ( !prototype ) {
		prototype = base;
		base = $.Widget;
	}

	// create selector for plugin
	///we can select the plugin using
	///$(":ui-dialog");
	$.expr[ ":" ][ fullName ] = function( elem ) {
		return !!$.data( elem, name );
	};

	$[ namespace ] = $[ namespace ] || {};
	
	///the constructor of all plugin
	///for example $.ui.dialog = function (optionas, element)
	//we create dialog like : new $.ui.dialog(options, elem)
	///
	///we can also create a dialog like $(elem).dialog(); but this
	///style is available after the call :
	// $.widget.bridge( name, $[ namespace ][ name ] );
	///for example, $.widget.bridge("dialog", $.ui.dialog)
	$[ namespace ][ name ] = function( options, element ) {
		// allow instantiation without initializing for simple inheritance
		if ( arguments.length ) {
			///this is combination of base (by defualt $.Widget),
			// and prototype Object
			this._createWidget( options, element );
		}
	};

	var basePrototype = new base();
	// we need to make the options hash a property directly on the new instance
	// otherwise we'll modify the options hash on the prototype that we're
	// inheriting from
	basePrototype.options = $.extend( true, {}, basePrototype.options );

	///$.ui.dialog.prototype is merge of basePrototype, and {..} and input parameter
	///prototype
	///$.ui.dialog is defined above : $[ namespace ][ name ]
	///we can change the plugin default by $.ui.dialog.prototype
	///for example $.ui.dialog.prototype.options.autoOpen = false
	$[ namespace ][ name ].prototype = $.extend( true, basePrototype,
		{
			namespace: namespace,
			widgetName: name,
			widgetEventPrefix: name,
			widgetBaseClass: fullName,
			base: base.prototype
		},
		
		prototype );


	///$.widget.bridge("dialog", $.ui.dialog")
	$.widget.bridge( name, $[ namespace ][ name ] );
};


///the function that create jQuery method to jQuery method
///the object will be something like $.ui.dialog which is a Constructor
///to create dialog behavior, by default it is
///function( options, element ) {
//		// allow instantiation without initializing for simple inheritance
//		if ( arguments.length ) {
//			this._createWidget( options, element );
//		}
//	};
///we can create a plugin instance like $(elem).dialog();
//or or can do : new $.ui.dialog(options, elem)
$.widget.bridge = function( name, object ) {

	///for example it can create jQuery.fn.dialog = function (options)
	///so $("<div />").dialog() will call this function
	$.fn[ name ] = function( options ) {
		var isMethodCall = typeof options === "string",
			args = slice.call( arguments, 1 ),
			returnValue = this;

		// allow multiple hashes to be passed on init
		options = !isMethodCall && args.length ?
			$.extend.apply( null, [ true, options ].concat(args) ) :
			options;

		// prevent calls to internal methods
		if ( isMethodCall && options.charAt( 0 ) === "_" ) {
			return returnValue;
		}

		if ( isMethodCall ) {
			this.each(function() {
				var instance = $.data( this, name );
				if ( !instance ) {
					return $.error( "cannot call methods on " + name + " prior to initialization; " +
						"attempted to call method '" + options + "'" );
				}
				if ( !$.isFunction( instance[options] ) ) {
					return $.error( "no such method '" + options + "' for " + name + " widget instance" );
				}
				var methodValue = instance[ options ].apply( instance, args );
				if ( methodValue !== instance && methodValue !== undefined ) {
					returnValue = methodValue;
					return false;
				}
			});
		} else {
			///behavior or plugin constructor
			this.each(function() {

				var instance = $.data( this, name );
				if ( instance ) {
					//if the behavior has been attached to this element
					//config it
					instance.option( options || {} )._init();
				} else {
					//if the behavior has not been attached
					//create it and save it to data cache
					$.data( this, name, new object( options, this ) );
				}
			});
		}

		return returnValue;
	};
};

///this will become the function $.ui.dialog
$.Widget = function( options, element ) {
	// allow instantiation without initializing for simple inheritance
	if ( arguments.length ) {
		this._createWidget( options, element );
	}
};

$.Widget.prototype = {
	widgetName: "widget",
	widgetEventPrefix: "",
	options: {
		disabled: false
	},
	_createWidget: function( options, element ) {
		// $.widget.bridge stores the plugin instance, but we do it anyway
		// so that it's stored even before the _create function runs
		$.data( element, this.widgetName, this );

		///save the reference back to the html element
		///so that the method of the instance can refer back
		///this element
		this.element = $( element );
		this.options = $.extend( true, {},
			this.options, //the default options
			this._getCreateOptions(),
			options );

		var self = this;
		this.element.bind( "remove." + this.widgetName, function() {
			self.destroy();
		});

		this._create();
		this._trigger( "create" );
		this._init();
	},
	_getCreateOptions: function() {
		return $.metadata && $.metadata.get( this.element[0] )[ this.widgetName ];
	},

	///to be defined in concrete widget
	_create: $.noop,

	///to be defined in concrete widget
	_init: $.noop,

	_super: function( method ) {
		return this.base[ method ].apply( this, slice.call( arguments, 1 ) );
	},

	_superApply: function( method, args ) {
		return this.base[ method ].apply( this, args );
	},

	destroy: function() {
		this._destroy();
		this.element
			.unbind( "." + this.widgetName )
			.removeData( this.widgetName );
		this.widget()
			.unbind( "." + this.widgetName )
			.removeAttr( "aria-disabled" )
			.removeClass(
				this.widgetBaseClass + "-disabled " +
				"ui-state-disabled" );
	},
	_destroy: $.noop,

	widget: function() {
		return this.element;
	},

	option: function( key, value ) {
		var options = key;

		if ( arguments.length === 0 ) {
			// don't return a reference to the internal hash
			return $.extend( {}, this.options );
		}

		if  (typeof key === "string" ) {
			if ( value === undefined ) {
				return this.options[ key ];
			}
			options = {};
			options[ key ] = value;
		}

		this._setOptions( options );

		return this;
	},
	_setOptions: function( options ) {
		var self = this;
		$.each( options, function( key, value ) {
			self._setOption( key, value );
		});

		return this;
	},
	_setOption: function( key, value ) {
		this.options[ key ] = value;

		if ( key === "disabled" ) {
			this.widget()
				.toggleClass( this.widgetBaseClass + "-disabled ui-state-disabled", !!value )
				.attr( "aria-disabled", value );
		}

		return this;
	},

	enable: function() {
		return this._setOption( "disabled", false );
	},
	disable: function() {
		return this._setOption( "disabled", true );
	},

	_trigger: function( type, event, data ) {
		var callback = this.options[ type ];

		event = $.Event( event );
		event.type = ( type === this.widgetEventPrefix ?
			type :
			this.widgetEventPrefix + type ).toLowerCase();
		data = data || {};

		// copy original event properties over to the new event
		// this would happen if we could call $.event.fix instead of $.Event
		// but we don't have a way to force an event to be fixed multiple times
		if ( event.originalEvent ) {
			for ( var i = $.event.props.length, prop; i; ) {
				prop = $.event.props[ --i ];
				event[ prop ] = event.originalEvent[ prop ];
			}
		}

		this.element.trigger( event, data );

		return !( $.isFunction(callback) &&
			callback.call( this.element[0], event, data ) === false ||
			event.isDefaultPrevented() );
	}
};

})( jQuery );
