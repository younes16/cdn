var pages = [];
var countries = [];
var masterPages = {};
var masterGeo = {};
var language = {
    "add_to_cart": {
        "en_us": "Add To Cart",
        "en_uk": "Add To Cart",
        "esp": "Agregar al carrito",
        "de": "In den Warenkorb",
        "fr": "Ajouter au panier",
        "it": "Aggiungi al carrello",
        "da": "Læg i indkøbskurven",
        "nl": "In winkelmand",
        "no": "Legg i handlekurven"
    }
};
$(document).ready(function() {


            apply_settings();


            $('.jscolor').focus(function() {
                $(this).removeClass('colorShapes');
            });

            $('.jscolor').blur(function() {
                $(this).addClass('colorShapes');
            });

            $('.popup_style').change(function() {
                var filename = "preview-" + $('#preview_buttons_cart').data('selected') + "-cart-" + $("input[name='variant_image']:checked").val() + '-' + $(this).val() + ".jpg";
                $('.device-cart').css("background", "url('https://assets.apphero.co/cart/images/" + filename + "') top left / auto 100% no-repeat");

            });

            ////// dropdown
            $('.dropdown').click(function() {
                $(this).attr('tabindex', 1).focus();
                $(this).toggleClass('active');
                $(this).find('.dropdown-menu').slideToggle(300);
            });
            $('.dropdown').focusout(function() {
                $(this).removeClass('active');
                $(this).find('.dropdown-menu').slideUp(300);
            });
            $('.dropdown .dropdown-menu li').click(function() {
                $(this).parents('.dropdown').find('span').html($(this).html());
                $(this).parents('.dropdown').find('input').attr('value', $(this).attr('id'));
            });


            /*End Dropdown Menu*/








            /////////

            $('.dropdown-menu li').click(function() {
                $('.aph_add_cart.mob').html("<span>+</span> " + language.add_to_cart[$("#lang_input").val()]);
                var filename = "preview-mobile.jpg";
                $('.device').css("background", "url('https://assets.apphero.co/cart/images/" + filename + "') top left / auto 100% no-repeat");
                $('.aph_cart_container').show();
                $('.aph_cart_container').removeClass('large').addClass('mob');
                $('.aph_cart').removeClass('large').addClass('mob');
                $('.aph_cart_icon').removeClass('large').addClass('mob');
                $('.aph_add_cart').removeClass('large').addClass('mob');
                $('#preview_buttons_bar').data('selected', 'mobile');
                $('.preview_mobile_button').children().find('path').eq(0).css('fill', '#000000');
                $('.preview_desktop_button').children().find('path').eq(0).css('fill', '#cccccc');
                $('.aph_add_cart').html("<span>+</span> " + language.add_to_cart[$("#lang_input").val()]);
                $('.aph_cart_container.mob').addClass($('.position').val());
            });

            $("input[name='variant_image']").change(function() {
                var filename = "preview-" + $('#preview_buttons_cart').data('selected') + "-cart-" + $("input[name='variant_image']:checked").val() + '-' + $('.popup_style').val() + ".jpg";
                $('.device-cart').css("background", "url('https://assets.apphero.co/cart/images/" + filename + "') top left / auto 100% no-repeat");
            });

            $('#qbuy_switch').change(function() {
                if ($(this).prop('checked')) {
                    $('.qbuy_position').removeAttr('disabled');
                    $('.device-qbuy').css({
                        'filter': "grayscale(0)",
                        "-webkit-filter": "grayscale(0)",
                        "-moz-filter": "grayscale(0)"
                    });
                } else {
                    $('.qbuy_position').attr('disabled', 'true');
                    $('.device-qbuy').css({
                        'filter': "grayscale(100%)",
                        "-webkit-filter": "grayscale(100%)",
                        "-moz-filter": "grayscale(100%)"
                    });
                }
            });

            $('.device-settings').change(function() {
                if ($(this).val() == "desktop") {
                    $('.position').attr('disabled', 'true');
                    $('.scroll_show').attr('disabled', 'true');
                } else {
                    $('.position').removeAttr('disabled');
                    $('.scroll_show').removeAttr('disabled');
                }
            });

            $('.qbuy_position').change(function() {
                $('.aph_qbuy').removeClass('top-left').removeClass('top-right').removeClass('bot-left').removeClass('bot-right').addClass($(this).val());
            });

            $('.alert-enable').click(function() {
                $('#switch').prop('checked', true);
                $('#qbuy_switch').prop('checked', true);
                $('.disabled-alert').fadeOut();
                $('.btn-save').click();
            });

            $('.nav').click(function() {
                if ($(this).data('nav') == "next") {
                    var filename = "preview-" + $('.preview_buttons').data('selected') + "-cart-" + $('.popup_style').val() + ".png";
                    $('.device').css("background", "url('https://assets.apphero.co/cart/images/" + filename + "') top left / auto 100% no-repeat");
                    $(this).data('nav', "prev");
                    $('.aph_cart_container').hide();
                    $(this).css('background', "url('https://assets.apphero.co/cart/images/nav-left.png') center center / 100% auto no-repeat");
                } else {
                    var filename = "preview-" + $('.preview_buttons').data('selected') + ".jpg";
                    $('.device').css("background", "url('https://assets.apphero.co/cart/images/" + filename + "') top left / auto 100% no-repeat");
                    $(this).data('nav', "next");
                    $(this).css('background', "url('https://assets.apphero.co/cart/images/nav-right.png') center center / 100% auto no-repeat");
                    $('.aph_cart_container').show();
                }
            });

            $('.position').change(function() {
                var filename = "preview-mobile.jpg";
                $('.device').css("background", "url('https://assets.apphero.co/cart/images/" + filename + "') top left / auto 100% no-repeat");
                $('.aph_cart_container').show();
                $('.aph_cart_container').removeClass('large').addClass('mob');
                $('.aph_cart').removeClass('large').addClass('mob');
                $('.aph_cart_icon').removeClass('large').addClass('mob');
                $('.aph_add_cart').removeClass('large').addClass('mob');
                $('#preview_buttons_bar').data('selected', 'mobile');
                $('.preview_mobile_button').children().find('path').eq(0).css('fill', '#000000');
                $('.preview_desktop_button').children().find('path').eq(0).css('fill', '#cccccc');
                $('.aph_add_cart').html("<span>+</span> " + language.add_to_cart[$("#lang_input").val()]);
                $('.nav').data('nav', 'next');
                $('.nav').css('background', "url('https://assets.apphero.co/cart/images/nav-right.png') center center / 100% auto no-repeat");
                if (this.value == "top") {
                    $('.aph_cart_container.mob').removeClass('bottom').addClass('top');
                } else if (this.value == "bottom") {
                    $('.aph_cart_container.mob').removeClass('top').addClass('bottom');
                }
            });

            $('.lang-selector').click(function() {
                $('.lang-selector').removeClass('selected');
                $(this).addClass('selected');
            });

            $('.buttonColor').change(function() {
                $('.cart_btn').css('background', '#' + this.value);
                $('.aph_add_cart').css('background', '#' + this.value);
            });

            $('.textColor').change(function() {
                $('.cart_btn').css('color', '#' + this.value);
                $('.aph_add_cart').css('color', '#' + this.value);
                $('.add-to-cart-icon').css('color', '#' + this.value);
            });

            $('.carticon_style').change(function() {
                var filename = "preview-" + $('#preview_buttons_bar').data('selected') + ".jpg";
                $('.device').css("background", "url('https://assets.apphero.co/cart/images/" + filename + "') top left / auto 100% no-repeat");
                $('.aph_cart_container').show();
                $('.nav').data('nav', 'next');
                $('.nav').css('background', "url('https://assets.apphero.co/cart/images/nav-right.png') center center / 100% auto no-repeat");
                if ($(this).val() == "dark") {
                    $('.aph_cart_icon').removeClass('light').addClass('dark');
                    $('.aph_cart').removeClass('light').addClass('dark');
                } else {
                    $('.aph_cart_icon').removeClass('dark').addClass('light');
                    $('.aph_cart').removeClass('dark').addClass('light');
                }

            });

            $('#rate_modal').on($.mod.CLOSE, function(event, mod) {
                sessionStorage["rate_session"] = 0;
            });

            $('#name_modal').on($.mod.CLOSE, function(event, mod) {
                $('.preview-section').show();
            });

            $(".upgrade-btn").click(function() {
                window.location.href = "pricing.php";
            });

            $(document).on('click', '.add_review', function() {

                    $('.rate_mod-title').remove();
                    $('.rate_modal-report').remove();
                    $('#rate_modal').prepend('<div class="rate_icon"</div>');
                    $('#rate_modal').prepend('<h1 class="rate_mod-title">Review Us</h1>');
                    $('.rate_modal-review').text('Review Now!').css({
                        'width': '90%',
                        'float': 'none',
                        'margin': '0 auto'
                    }).removeClass('add_review').addClass('review_redirect');
                    $('.rate_mod-body').text('Would you mind taking a moment to review us on Shopify\'s App Store? Each review helps us tremendously! 
                        ');
                    });

                $('.rate_modal-report').click(function() {
                    window.top.location.href = "mailto:cart-booster@apphero.co?subject=Problem Report";
                });

                $(document).on('click', '.review_redirect', function() {
                    localStorage["never_rate_flag"] = 1;
                    window.top.location.href = "https://apps.shopify.com/sticky-add-to-cart-booster?reveal_new_review=true";
                });

                $(document).on('click', '.btn-save', function() {
                    modifyBar();
                });

                $(document).on('click', '.preview_mobile_button', function() {
                    var target = $(this).data("target");
                    switch (target) {
                        case "bar":
                            $('.desktop-frame').css("background", "url('https://assets.apphero.co/cart/images/preview-mobile.jpg') top left / auto 100% no-repeat");
                            $(this).parent().data('selected', 'mobile');
                            $('.aph_cart_container').removeClass('large').addClass('mob');
                            $('.aph_cart_container').addClass($('.position').val());
                            $('.aph_cart').removeClass('large').addClass('mob');
                            $('.aph_cart_icon').removeClass('large').addClass('mob');
                            $('.aph_add_cart').removeClass('large').addClass('mob');
                            $('.aph_add_cart').css('background', '#' + $('.buttonColor').val());
                            $('.aph_add_cart').css('color', '#' + $('.textColor').val());
                            $('.aph_cart_container').show();
                            $('.aph_add_cart').html("<span>+</span> " + language.add_to_cart[$("#lang_input").val()]);
                            break;

                        case "cartView":
                            $('.device-cart').css("background", "url('https://assets.apphero.co/cart/images/preview-mobile-cart-" + $("input[name='variant_image']:checked").val() + '-' + $('.popup_style').val() + ".jpg') top left / auto 100% no-repeat");
                            $(this).parent().data('selected', 'mobile');
                            break;

                    }

                    $(this).children().find('path').eq(0).css('fill', '#000000');
                    $(this).siblings('.preview_desktop_button').children().find('path').eq(0).css('fill', '#cccccc');

                });

                $(document).on('click', '.preview_desktop_button', function() {
                    var target = $(this).data("target");
                    switch (target) {
                        case "bar":
                            $('.desktop-frame').css("background", "url('https://assets.apphero.co/cart/images/preview-desktop.jpg') top left / auto 100% no-repeat");
                            $(this).parent().data('selected', 'desktop');
                            $('.aph_cart_container').removeClass('mob').addClass('large');
                            $('.aph_cart_container').removeClass('top').removeClass('bottom');
                            $('.aph_cart').removeClass('mob').addClass('large');
                            $('.aph_cart_icon').removeClass('mob').addClass('large');
                            $('.aph_add_cart').removeClass('mob').addClass('large');
                            $('.aph_add_cart').css('background', '#' + $('.buttonColor').val());
                            $('.aph_add_cart').css('color', '#' + $('.textColor').val());
                            $('.aph_cart_container').show();
                            var svg = '<svg class="add-to-cart-icon" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.23 18.1"><title>add-cart-SVG</title><path d="M10.4,18.9a2,2,0,1,0-2,2A1.94,1.94,0,0,0,10.4,18.9Zm-2.7,0a.86.86,0,0,1,.8-.8.8.8,0,1,1,0,1.6h0A.86.86,0,0,1,7.7,18.9Z" transform="translate(-2.9 -2.8)"/><path d="M17.9,18.9a2,2,0,1,0-2,2A2,2,0,0,0,17.9,18.9Zm-2.7,0a.8.8,0,1,1,.8.8A.86.86,0,0,1,15.2,18.9Z" transform="translate(-2.9 -2.8)"/><path d="M19.7,6.2a.56.56,0,0,0-.7.4l-.2.8L17.7,12a1,1,0,0,1-.9.7h-9L6.6,5.6A1.82,1.82,0,0,0,4.8,4.1H3.5a.65.65,0,0,0-.6.6.65.65,0,0,0,.6.6H4.8a.63.63,0,0,1,.6.5L7,15.9a.56.56,0,0,0,.6.5h9.7a.6.6,0,1,0,0-1.2H8.1L7.9,14h8.8a2.25,2.25,0,0,0,2.1-1.6L20.1,7C20.2,6.6,20,6.2,19.7,6.2Z" transform="translate(-2.9 -2.8)"/><path d="M15.8,7.1a.61.61,0,0,0-.8,0L13.4,8.7V3.4a.6.6,0,1,0-1.2,0V8.6L10.6,7a.57.57,0,1,0-.8.8l2.6,2.6a.76.76,0,0,0,.4.2.52.52,0,0,0,.4-.2l2.6-2.6C16,7.7,16,7.3,15.8,7.1Z" transform="translate(-2.9 -2.8)"/></svg>';
                            $('.aph_add_cart').html("<div class='shapeshifter play'>" + svg + "</div>");
                            break;

                        case "cartView":
                            $('.device-cart').css("background", "url('https://assets.apphero.co/cart/images/preview-desktop-cart-" + $("input[name='variant_image']:checked").val() + '-' + $('.popup_style').val() + ".jpg') top left / auto 100% no-repeat");
                            $(this).parent().data('selected', 'desktop');
                            break;

                    }

                    $(this).children().find('path').eq(0).css('fill', '#000000');
                    $(this).siblings('.preview_mobile_button').children().find('path').eq(0).css('fill', '#cccccc');


                });

            });


        function modifyBar() {
            $('.btn-save').remove();
            $('.btns-container').prepend(
                '<button type="button" class="btn-save Polaris-Button Polaris-Button--primary Polaris-Button--disabled Polaris-Button--loading" disabled="" role="alert" aria-busy="true"><span class="Polaris-Button__Content">' +
                '<span class="Polaris-Button__Spinner"><svg viewBox="0 0 20 20" class="Polaris-Spinner Polaris-Spinner--colorWhite Polaris-Spinner--sizeSmall" aria-label="Loading" role="status">' +
                '<path class="Polaris-Spinner--colorWhite" d="M7.229 1.173a9.25 9.25 0 1 0 11.655 11.412 1.25 1.25 0 1 0-2.4-.698 6.75 6.75 0 1 1-8.506-8.329 1.25 1.25 0 1 0-.75-2.385z"></path></svg></span><span>Save</span></span></button>'
            );
            var enabled = $('#switch').prop('checked');
            var device_settings = $('.device-settings').val();
            var position = $('.position').val();
            var button_color = $('.buttonColor').val();
            var text_color = $('.textColor').val();
            var cart_dest = $("input[name='cart_dest']:checked").val();
            var scroll_option = $(".scroll_show").val();
            var popup_style = $('.popup_style').val();
            var carticon_style = $('.carticon_style').val();
            var var_images = $("input[name='variant_image']:checked").val();
            var qbuy_enabled = $('#qbuy_switch').prop('checked');
            var qbuy_position = $('.qbuy_position').val();
            var lang = $("#lang_input").val();
            var prec_setting = $(".precision_settings").val();
            console.log(lang)
let    data= {
                    enabled: enabled,
                    aph_device: device_settings,
                    position: position,
                    button_color: button_color,
                    text_color: text_color,
                    cart_dest: cart_dest,
                    scroll_option: scroll_option,
                    popup_style: popup_style,
                    carticon_style: carticon_style,
                    var_images: var_images,
                    qbuy_enabled: qbuy_enabled,
                    qbuy_position: qbuy_position,
                    lang: lang,
                    prec_setting: prec_setting
                }
                console.log(data)

            $.ajax({
                type: "POST",
                url: "modscript.php",
                data: {
                    enabled: enabled,
                    aph_device: device_settings,
                    position: position,
                    button_color: button_color,
                    text_color: text_color,
                    cart_dest: cart_dest,
                    scroll_option: scroll_option,
                    popup_style: popup_style,
                    carticon_style: carticon_style,
                    var_images: var_images,
                    qbuy_enabled: qbuy_enabled,
                    qbuy_position: qbuy_position,
                    lang: lang,
                    prec_setting: prec_setting
                },
                success: function(result) {


                    /*	ShopifyApp.flashNotice("Settings Saved");
                    	ShopifyApp.Bar.loadingOff();*/
                    flashMessageControl();
                    $('.btn-save').remove();
                    $('.btns-container').append('<button type="button" class="button btn-save">Save</button>');


                }
            });


        }



        function apply_settings() {

            $('.aph_cart_container').addClass($('.position').val());

            $('.aph_add_cart').css({
                'background': '#' + $('.buttonColor').val(),
                'color': '#' + $('.textColor').val()
            });
            $('.aph_cart').addClass($('.carticon_style').val());
            $('.aph_cart_icon').addClass($('.carticon_style').val());
            $('.device-cart').css('background', "url('https://assets.apphero.co/cart/images/preview-mobile-cart-" + $("input[name='variant_image']:checked").val() + '-' + $('.popup_style').val() + ".jpg') top left / auto 100% no-repeat");
            $('.aph_qbuy').addClass($('.qbuy_position').val());
            $('.aph_cart_container').fadeIn();
            $('.aph_add_cart.mob').html("<span>+</span> " + language.add_to_cart[$("#lang_input").val()]);
        }



        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }


        function flashMessageControl() {

            $(".flash-message").animate({
                bottom: "20px"
            }, 300);

            setTimeout(function() {
                $(".flash-message").animate({
                    bottom: "-200px"
                }, 300);
            }, 2000);

        }




        function parse_string(string) {
            var stripped_string = string.replace('&quot;', '');
            var parser = new DOMParser;
            var dom = parser.parseFromString(stripped_string, 'text/html');
            var parsed_string = dom.body.textContent;
            return parsed_string;
        }
