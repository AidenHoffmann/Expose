var loadnext = 5; // preload next 5 slides
var loadprev = 2; // keep previous 2 slides in case user scrolls up

var videoloadnext=2; // preload videos less

var resourcepath;

var current_resolution = 1920;
var resolution = [];

var disqus_loaded = false;
var current_slide = $('.slide').get(0);

var video_formats={
	h265: { extension: "mp4", type: "video/mp4; codecs=hev1.1.2.L93.B0"},
	h264: { extension: "mp4", type: "video/mp4"},
	vp9: { extension: "webm", type: "video/webm; codecs=vp9"},
	vp8: { extension: "webm", type: "video/webm; codecs=vp8"},
	ogv: { extension: "ogv", type: "video/ogg"}
};

const fullPage = document.getElementById('#fullpage');

$(document).ready(function(){

	// set slide heights to prevent reflow
	$('.slide').each(function(){
		$(this).css('padding-top', (100 * $(this).data('imageheight') / $(this).data('imagewidth')) + '%');
		$(this).click(function() {
			fullPage.style.backgroundImage = 'url(' + $(this).find('img').attr('src') + ')';
			fullPage.style.display = 'block';
		});
	});
	
	resourcepath = $('body').data('respath');
	

	// click away from dialog
	$('body').click(function(e) {
	    if (!$(e.target).is('#resolution')) {
	        $('#resolution').removeClass('active');
	    }
	    if (!$(e.target).is('#share')) {
	        $('#share').removeClass('active');
	    }
	});
  			
	scrollcheck();
	
	// text toggle
	$('#textbutton').click(function(){
		if($(this).hasClass('active')){
			$('.post').addClass('hidden');
			$(this).removeClass('active');
			$(this).find('.text').text('show text');
		}
		else{
			$('.post').removeClass('hidden');
			$(this).addClass('active');
			$(this).find('.text').text('hide text');
		}
		
		return false;
	});
	
});

function scrollcheck(){

	// current slide is the one with the largest overlap with screen
	var new_slide = false;
	var maxoverlap = 0;
	$('.slide').each(function(){
		var overlap = findoverlap(this);				
	
		if(overlap > maxoverlap){
			maxoverlap = overlap;
			new_slide = this;
		}
	});
	
	if(new_slide && new_slide != current_slide){
		current_slide = new_slide;
		var index = $('.slide').index(current_slide);
		
		$('.slide .image').removeClass('active');
		$('.slide video').removeClass('active');
		
		// load next N slides as per config
		// remove videos from dom as we scroll past
		$('.slide').each(function(i){
			var img = $(this).find('img.image');
			
			var set_res = current_resolution;
			if(parseInt($(this).data('imagewidth')) < current_resolution){
				set_res = parseInt($(this).data('imagewidth'));
			}
			
			if(i-index >= -loadprev && i-index<=loadnext){
				var url = resourcepath + img.data('url');
				if($(this).data('type') == 'video'){
					if(i-index >= 0 && i-index <= videoloadnext){ // preload next N videos
						if($(this).find('video').length === 0){

							var formats = String($(this).data("videoformats")).split(" ");
							if(formats.length > 0){
								var vidstring = '<div class="progress active"><div class="bar" style="background-color: '+$(this).parent().data('textcolor')+'"></div></div>';
								vidstring += '<video class="image" poster="' + url+'/'+set_res+'.jpg" alt="" autoplay="autoplay" loop="loop" preload="auto" width="'+$(this).width()+'" height="'+$(this).outerHeight()+'">';
								
								$.each(formats, function(i, v){
									if(v){
										vformat = video_formats[v];
										var sourceurl = url+'/'+set_res+'-'+v+'.'+vformat.extension;
										vidstring += '<source src="'+sourceurl+'" type="'+vformat.type+'" data-extension="'+(v+'.'+vformat.extension)+'"></source>';
									}
								});
								
								vidstring += '</video>';
								
								$(this).append(vidstring);
								$(this).find('video').get(0).addEventListener('progress', function() {
									try{
										var percent = 100 * this.buffered.end(0) / this.duration;
										$(this).parent().find('.progress .bar').css('width',percent+'%');
										if(percent > 90){
											$(this).parent().find('.progress').removeClass('active');
										}
									}
									catch (e) {}
								});
							}
						}
						
					}
				}
				img.prop('src',url+'/'+set_res+'.jpg').removeClass('blank');
			}
			else{
				// keeping all videos takes too much memory, reset as we go along
				$(this).find('img.image').addClass('blank');
				$(this).find('video, .progress').remove();
			}
		});
		
		$(current_slide).find('.image').addClass('active');

		$(current_slide).nextAll().filter('.slide').slice(0,5).find('img.image').addClass('active');
		$(current_slide).prevAll().filter('.slide').slice(0,2).find('img.image').addClass('active');
				
		// highlight nav
		
		if(index >= 0){
			$('#marker li.active').removeClass('active');
			$('#marker li').eq(index).addClass('active');
		}
		
		return false;
	}
}

_now = Date.now || function() { return new Date().getTime(); };

throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

var throttled = throttle(scrollcheck, 700);
$(window).scroll(throttled);

function findoverlap(elem)
{
	var winHeight = $(window).height();
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + winHeight;

    var elemTop = $(elem).offset().top;
	var elemHeight = $(elem).outerHeight();
    var elemBottom = elemTop + elemHeight;
	
	var overlap = (Math.min(elemBottom, docViewBottom) - Math.max(elemTop, docViewTop));
	if(overlap > 0){
		return overlap/(winHeight);
	}
    return 0;
}

// find all intersections between a horizontal line at height, and the given polygon
function intersect(height, polygon){
	if(polygon.length < 3){
		return false;
	}
	
	var points = [];
	for(var i=0; i<polygon.length-1; i++){
		var p1 = polygon[i];
		var p2 = polygon[i+1];
		
		// horizontal line
		if(p1.y == p2.y && height == p1.y){
			if(p1.x < p2.x){
				points.push(p1.x);
			}
			else{
				points.push(p2.x);
			}
		}		
		if(p1.y == height && $.inArray(p1.x, points) < 0){
			points.push(p1.x);
		}
		if(p2.y == height && $.inArray(p2.x, points) < 0){
			points.push(p2.x);
		}
		if(p1.y < height && p2.y > height){
			points.push(p1.x + ((height-p1.y)/(p2.y-p1.y))*(p2.x-p1.x));
		}
		else if(p1.y > height && p2.y < height){
			points.push(p2.x + ((height-p2.y)/(p1.y-p2.y))*(p1.x-p2.x));
		}
	}
	
	
	// sort intercepts left to right
	points.sort(function(a,b){
		return a-b;
	});
	
	return points;
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

// add back browser detect
jQuery.uaMatch = function( ua ) {
ua = ua.toLowerCase();
var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
    /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
    /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
    /(msie) ([\w.]+)/.exec( ua ) ||
    ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
    [];
return {
    browser: match[ 1 ] || "",
    version: match[ 2 ] || "0"
};
};
if ( !jQuery.browser ) {
matched = jQuery.uaMatch( navigator.userAgent );
browser = {};
if ( matched.browser ) {
    browser[ matched.browser ] = true;
    browser.version = matched.version;
}
// Chrome is Webkit, but Webkit is also Safari.
if ( browser.chrome ) {
    browser.webkit = true;
} else if ( browser.webkit ) {
    browser.safari = true;
}
jQuery.browser = browser;
}
