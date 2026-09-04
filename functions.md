<?php
  /**
   * Theme functions and definitions.
   *
   * @package HelloElementorChild
   */

  if ( ! defined( 'ABSPATH' ) ) {
      exit; // Exit if accessed directly.
  }

  define( 'HELLO_ELEMENTOR_CHILD_VERSION', '2.0.0' );

  function hello_elementor_child_scripts_styles() {
      wp_enqueue_style(
          'hello-elementor-child-style',
          get_stylesheet_directory_uri() . '/style.css',
          [
              'hello-elementor-theme-style',
          ],
          HELLO_ELEMENTOR_CHILD_VERSION
      );

      // [ADDED] Altcha widget script
      wp_enqueue_script(
          'altcha-widget',
          'https://cdn.altcha.org/js/latest/altcha.min.js',
          [],
          null,
          true
      );
  }
  add_action( 'wp_enqueue_scripts', 'hello_elementor_child_scripts_styles', 20 );

  // [ADDED] Altcha requires type="module" to work as web component
  function altcha_add_module_type( $tag, $handle, $src ) {
      if ( 'altcha-widget' === $handle ) {
          $tag = str_replace( ' src=', ' type="module" src=', $tag );
      }
      return $tag;
  }
  add_filter( 'script_loader_tag', 'altcha_add_module_type', 10, 3 );


  // ─── [ATTRIBUTION] 1/3 — Captura cruda en TODA página → cookie first-party ───
  // Corre temprano en <head>. Guarda utm_*/gclid/fbclid/msclkid + referrer + landing
  // en la cookie 'lf_attrib' (JSON con first-touch y last-touch, 90 días). SIN lógica
  // de negocio: solo persiste señales crudas.
  function lf_attribution_capture_script() {
      ?>
  <script>
  (function () {
    var COOKIE  = 'lf_attrib';
    var MAX_AGE = 60 * 60 * 24 * 90; // 90 días
    var KEYS    = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','msclkid'];

    function readCookie(name) {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    }
    function writeCookie(name, value) {
      document.cookie = name + '=' + encodeURIComponent(value) +
        '; Max-Age=' + MAX_AGE + '; Path=/; SameSite=Lax' +
        (location.protocol === 'https:' ? '; Secure' : '');
    }

    var p = new URLSearchParams(location.search);
    var params = {};
    KEYS.forEach(function (k) { var v = p.get(k); if (v) params[k] = String(v).slice(0, 500); });
    var hasCampaign = Object.keys(params).length > 0;

    var stored = {};
    try { stored = JSON.parse(readCookie(COOKIE) || '{}'); } catch (e) { stored = {}; }

    var touch = {
      params: params,
      referrer: document.referrer || '',
      landing_page: location.origin + location.pathname,
      touched_at: new Date().toISOString()
    };

    // last-touch: se actualiza en la 1ª visita o cuando llega una nueva campaña.
    if (hasCampaign || !stored.last) stored.last = touch;
    // first-touch: se fija una sola vez.
    if (!stored.first) stored.first = touch;

    writeCookie(COOKIE, JSON.stringify(stored));
  })();
  </script>
      <?php
  }
  add_action( 'wp_head', 'lf_attribution_capture_script', 1 );


  // Formulario y manejo de envío
  function custom_lawyer_form() {
      global $lf_errors, $lf_old;
      if ( !is_array($lf_errors) ) $lf_errors = array();
      if ( !is_array($lf_old) )    $lf_old    = array();

      // Helper to get old value
      $v = function($key, $default = '') use ($lf_old) {
          return isset($lf_old[$key]) ? esc_attr($lf_old[$key]) : $default;
      };
      // Helper to render inline error
      $e = function($key) use ($lf_errors) {
          if ( isset($lf_errors[$key]) ) {
              return '<p class="lf-field-error">' . esc_html($lf_errors[$key]) . '</p>';
          }
          return '';
      };
      // Helper to mark field with error class
      $ec = function($key) use ($lf_errors) {
          return isset($lf_errors[$key]) ? 'lf-has-error' : '';
      };

      ob_start(); ?>
      <style>
          #lawyer-form {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px 24px;
              max-width: 720px;
              margin: 0 auto;
          }
          #lawyer-form .lf-full {
              grid-column: 1 / -1;
          }
          #lawyer-form label {
              display: block;
              margin-bottom: 6px;
              font-weight: 600;
              font-size: 14px;
          }
          #lawyer-form input,
          #lawyer-form select,
          #lawyer-form textarea {
              width: 100%;
              padding: 10px 12px;
              border: 1px solid #ccc;
              border-radius: 6px;
              font-size: 14px;
              box-sizing: border-box;
          }
          #lawyer-form textarea {
              min-height: 90px;
              resize: vertical;
          }
          #lawyer-form input:focus,
          #lawyer-form select:focus,
          #lawyer-form textarea:focus {
              outline: none;
              border-color: #2563eb;
              box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
          }
          /* Error styles */
          #lawyer-form .lf-has-error input,
          #lawyer-form .lf-has-error select,
          #lawyer-form .lf-has-error textarea {
              border-color: #dc2626;
              box-shadow: 0 0 0 3px rgba(220,38,38,0.1);
          }
          #lawyer-form .lf-field-error {
              color: #dc2626;
              font-size: 13px;
              font-weight: 500;
              margin: 4px 0 0 0;
          }
          #lawyer-form .lf-form-error {
              grid-column: 1 / -1;
              color: #dc2626;
              font-weight: 600;
              font-size: 14px;
              padding: 10px 16px;
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 6px;
          }
          #lawyer-form .lf-bot-check {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 12px 16px;
              border: 1px solid #ccc;
              border-radius: 6px;
              background: #fafafa;
              cursor: pointer;
              user-select: none;
          }
          #lawyer-form .lf-bot-check input[type="checkbox"] {
              width: 20px;
              height: 20px;
              margin: 0;
              cursor: pointer;
          }
          #lawyer-form .lf-bot-check span {
              font-size: 14px;
              font-weight: 500;
          }
          #lawyer-form button[type="submit"] {
              padding: 12px 32px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              border-radius: 6px;
          }
          .lf-hp { position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; overflow: hidden; }
          @media (max-width: 600px) {
              #lawyer-form { grid-template-columns: 1fr; }
          }
      </style>

      <form id="lawyer-form" method="post" action="">
          <?php if ( isset($lf_errors['_form']) ) : ?>
              <p class="lf-form-error"><?php echo esc_html($lf_errors['_form']); ?></p>
          <?php endif; ?>

          <div class="<?php echo $ec('full_name'); ?>">
              <label for="full_name">Full Name</label>
              <input type="text" name="full_name" required value="<?php echo $v('full_name'); ?>">
              <?php echo $e('full_name'); ?>
          </div>
          <div class="<?php echo $ec('number'); ?>">
              <label for="number">Phone Number (US/Canada)</label>
              <input type="tel" name="number" required placeholder="e.g. (416) 555-1234 or 1-800-555-1234"
                     value="<?php echo $v('number'); ?>"
                     pattern="[\d\s\(\)\-\+\.]{7,20}" title="Please enter a valid US or Canadian phone number">
              <?php echo $e('number'); ?>
          </div>
          <div class="<?php echo $ec('email'); ?>">
              <label for="email">Email</label>
              <input type="email" name="email" required value="<?php echo $v('email'); ?>">
              <?php echo $e('email'); ?>
          </div>
          <div>
              <label for="lawyer_type">Type of Lawyer Needed</label>
              <select name="lawyer_type" required>
                  <?php
                  $types = array('Personal Injury Lawyer','Family Lawyer','Criminal Lawyer','Real Estate Lawyer','Corporate Lawyer','Employment Lawyer');
                  foreach ($types as $t) {
                      $sel = ($v('lawyer_type') === $t) ? ' selected' : '';
                      echo '<option value="' . esc_attr($t) . '"' . $sel . '>' . esc_html($t) . '</option>';
                  }
                  ?>
              </select>
          </div>
          <div class="lf-full <?php echo $ec('description'); ?>">
              <label for="description">Leave Us a Brief Description</label>
              <textarea name="description"><?php echo esc_textarea( isset($lf_old['description']) ? $lf_old['description'] : '' ); ?></textarea>
              <?php echo $e('description'); ?>
          </div>

          <!-- Honeypot -->
          <div class="lf-hp" aria-hidden="true">
              <label for="website_url">Website</label>
              <input type="text" name="website_url" tabindex="-1" autocomplete="off">
          </div>

          <!-- [ATTRIBUTION] 2/3 — Hidden fields poblados por JS desde la cookie lf_attrib -->
          <input type="hidden" name="utm_source"     value="">
          <input type="hidden" name="utm_medium"     value="">
          <input type="hidden" name="utm_campaign"   value="">
          <input type="hidden" name="utm_term"       value="">
          <input type="hidden" name="utm_content"    value="">
          <input type="hidden" name="gclid"          value="">
          <input type="hidden" name="fbclid"         value="">
          <input type="hidden" name="msclkid"        value="">
          <input type="hidden" name="referrer_url"   value="">
          <input type="hidden" name="landing_page"   value="">
          <input type="hidden" name="first_touch_at" value="">

          <!-- Human verification -->
          <div class="lf-full <?php echo $ec('not_a_bot'); ?>">
              <label class="lf-bot-check">
                  <input type="checkbox" name="not_a_bot" value="1" required>
                  <span>I am not a robot</span>
              </label>
              <?php echo $e('not_a_bot'); ?>
          </div>
          <div class="lf-full">
              <altcha-widget
                  challengeurl="<?php echo esc_url( rest_url( 'lawyer/v1/altcha-challenge' ) ); ?>"
                  hidefooter
              ></altcha-widget>
          </div>

          <div class="lf-full">
              <button type="submit" name="submit_form">Submit</button>
          </div>
      </form>
      <?php
      return ob_get_clean();
  }
  add_shortcode('lawyer_form', 'custom_lawyer_form');


  // ─── [ATTRIBUTION] 3/3 — Rellena los hidden fields desde la cookie antes del submit ───
  function lf_attribution_fill_form_script() {
      ?>
  <script>
  (function () {
    var form = document.getElementById('lawyer-form');
    if (!form) return;

    function readCookie(name) {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    }
    function setField(name, value) {
      var el = form.querySelector('[name="' + name + '"]');
      if (el) el.value = (value == null) ? '' : String(value).slice(0, 2000);
    }
    function fill() {
      var stored = {};
      try { stored = JSON.parse(readCookie('lf_attrib') || '{}'); } catch (e) { stored = {}; }
      var last  = stored.last  || {};
      var first = stored.first || {};
      var p     = last.params  || {};
      setField('utm_source',     p.utm_source);
      setField('utm_medium',     p.utm_medium);
      setField('utm_campaign',   p.utm_campaign);
      setField('utm_term',       p.utm_term);
      setField('utm_content',    p.utm_content);
      setField('gclid',          p.gclid);
      setField('fbclid',         p.fbclid);
      setField('msclkid',        p.msclkid);
      setField('referrer_url',   last.referrer);
      setField('landing_page',   last.landing_page);
      setField('first_touch_at', first.touched_at);
    }
    fill();
    // Re-fill al enviar por si la cookie cambió durante la sesión.
    form.addEventListener('submit', fill);
  })();
  </script>
      <?php
  }
  add_action( 'wp_footer', 'lf_attribution_fill_form_script', 99 );


  // [MODIFIED] Errors stored in global so the form can show them inline per field
  function handle_lawyer_form_submission() {
      global $lf_errors, $lf_old;
      $lf_errors = array();
      $lf_old    = array();

      if ( !isset($_POST['submit_form']) ) return;

      // Preserve submitted values for repopulating the form
      $lf_old = array(
          'full_name'   => isset($_POST['full_name']) ? sanitize_text_field($_POST['full_name']) : '',
          'number'      => isset($_POST['number']) ? sanitize_text_field($_POST['number']) : '',
          'email'       => isset($_POST['email']) ? sanitize_email($_POST['email']) : '',
          'lawyer_type' => isset($_POST['lawyer_type']) ? sanitize_text_field($_POST['lawyer_type']) : '',
          'description' => isset($_POST['description']) ? sanitize_textarea_field($_POST['description']) : '',
      );

      // Honeypot — silent block, no error shown
      if ( !empty( $_POST['website_url'] ) ) {
          $lf_errors['_form'] = 'Submission blocked.';
          return;
      }

      // "I am not a robot" checkbox
      if ( empty( $_POST['not_a_bot'] ) ) {
          $lf_errors['not_a_bot'] = 'Please confirm you are not a robot.';
      }

      // Altcha (optional)
      $altcha_payload = isset( $_POST['altcha'] ) ? $_POST['altcha'] : '';
      if ( !empty( $altcha_payload ) && ! verify_altcha_solution( $altcha_payload ) ) {
          $lf_errors['_form'] = 'Verification failed. Please try again.';
      }

      // Name validation
      $raw_name = trim( $lf_old['full_name'] );
      if ( empty( $raw_name ) ) {
          $lf_errors['full_name'] = 'Full name is required.';
      } elseif ( preg_match( '/[_\\\\\/\@\#\$\%\^\&\*\=\+\[\]\{\}\|<>~`\d]/', $raw_name ) ) {
          $lf_errors['full_name'] = 'Name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed.';
      } elseif ( preg_match( '/[\x{0400}-\x{04FF}\x{0500}-\x{052F}\x{4E00}-\x{9FFF}\x{0600}-\x{06FF}\x{0980}-\x{09FF}\x{0900}-\x{097F}]/u', $raw_name ) ) {
          $lf_errors['full_name'] = 'Please enter your name in English.';
      }

      // Phone validation
      $raw_phone  = trim( $lf_old['number'] );
      $digits     = preg_replace( '/[^0-9]/', '', $raw_phone );
      if ( empty( $raw_phone ) ) {
          $lf_errors['number'] = 'Phone number is required.';
      } elseif ( strlen( $digits ) < 10 ) {
          $lf_errors['number'] = 'Please enter a valid phone number with at least 10 digits.';
      } elseif ( strlen( $digits ) === 11 && $digits[0] !== '1' ) {
          $lf_errors['number'] = 'Please enter a valid US or Canadian phone number.';
      } elseif ( strlen( $digits ) > 11 ) {
          $lf_errors['number'] = 'Please enter a valid US or Canadian phone number.';
      }

      // Email validation
      if ( empty( $lf_old['email'] ) || !is_email( $lf_old['email'] ) ) {
          $lf_errors['email'] = 'Please enter a valid email address.';
      }

      // Description validation — reject non-Latin scripts (Cyrillic, Chinese, Arabic, etc.)
      $raw_desc = trim( $lf_old['description'] );
      if ( !empty( $raw_desc ) && preg_match(
  '/[\x{0400}-\x{04FF}\x{0500}-\x{052F}\x{4E00}-\x{9FFF}\x{0600}-\x{06FF}\x{0980}-\x{09FF}\x{0900}-\x{097F}\x{3040}-\x{309F}\x{30A0}-\x{30FF}]/u', $raw_desc ) ) {
          $lf_errors['description'] = 'Please write your description in English.';
      }

      // Description — reject URLs
      if ( !empty( $raw_desc ) && preg_match( '/https?:\/\/|www\.|\.com\/|\.ru\/|\.net\/|\.org\//i', $raw_desc ) ) {
          $lf_errors['description'] = 'Links are not allowed in the description.';
      }

      // If any errors, stop here — form will re-render with errors inline
      if ( !empty( $lf_errors ) ) return;

      // All validations passed — insert
      global $wpdb;
      $table_name = $wpdb->prefix . 'lawyer_requests';

      // ── [ATTRIBUTION] Señales crudas capturadas en cliente (SIN derivar canal aquí) ──
      $clean = function ( $key, $max ) {
          if ( ! isset( $_POST[ $key ] ) ) return null;
          $val = trim( sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) );
          return ( $val === '' ) ? null : substr( $val, 0, $max );
      };
      $clean_url = function ( $key, $max ) {
          if ( ! isset( $_POST[ $key ] ) ) return null;
          $val = trim( esc_url_raw( wp_unslash( $_POST[ $key ] ) ) );
          return ( $val === '' ) ? null : substr( $val, 0, $max );
      };

      $attribution = array(
          'utm_source'     => $clean( 'utm_source', 255 ),
          'utm_medium'     => $clean( 'utm_medium', 255 ),
          'utm_campaign'   => $clean( 'utm_campaign', 255 ),
          'utm_term'       => $clean( 'utm_term', 255 ),
          'utm_content'    => $clean( 'utm_content', 255 ),
          'gclid'          => $clean( 'gclid', 512 ),
          'fbclid'         => $clean( 'fbclid', 512 ),
          'msclkid'        => $clean( 'msclkid', 512 ),
          'referrer_url'   => $clean_url( 'referrer_url', 2048 ),
          'landing_page'   => $clean_url( 'landing_page', 2048 ),
          'first_touch_at' => null,
      );
      // ISO 8601 → MySQL datetime (UTC). Tolerante a valores inválidos.
      if ( ! empty( $_POST['first_touch_at'] ) ) {
          $ts = strtotime( sanitize_text_field( wp_unslash( $_POST['first_touch_at'] ) ) );
          if ( $ts ) $attribution['first_touch_at'] = gmdate( 'Y-m-d H:i:s', $ts );
      }

      // Resiliencia: solo incluir columnas de atribución que EXISTAN en la tabla
      // (por si la migración del backend aún no corrió → el form nunca rompe).
      $existing_cols = $wpdb->get_col( "SHOW COLUMNS FROM `$table_name`", 0 );
      $attribution   = array_intersect_key( $attribution, array_flip( (array) $existing_cols ) );
      $attribution   = array_filter( $attribution, function ( $x ) { return $x !== null; } );

      $data = array(
          'full_name'   => $lf_old['full_name'],
          'number'      => $lf_old['number'],
          'email'       => $lf_old['email'],
          'lawyer_type' => $lf_old['lawyer_type'],
          'description' => $lf_old['description'],
          'status'      => 'NEW',
          'created_at'  => current_time('mysql'),
          'updated_at'  => NULL,
          'assigned_at' => NULL,
      );
      $data = array_merge( $data, $attribution ); // [ATTRIBUTION]

      $inserted = $wpdb->insert( $table_name, $data );

      if ( $inserted ) {
          echo '<script>window.location.href = "' . get_permalink(134) . '";</script>';
          exit;
      } else {
          $lf_errors['_form'] = 'Sorry, there was an error submitting your request. Please try again.';
      }
  }
  add_action('init', 'handle_lawyer_form_submission');


  // Crear tabla en la base de datos
  function create_lawyer_requests_table() {
      global $wpdb;
      $table_name = $wpdb->prefix . 'lawyer_requests';
      $charset_collate = $wpdb->get_charset_collate();

      $sql = "CREATE TABLE $table_name (
          id mediumint(9) NOT NULL AUTO_INCREMENT,
          full_name text NOT NULL,
          number text NOT NULL,
          email text NOT NULL,
          lawyer_type text NOT NULL,
          description text NOT NULL,
          status varchar(20) NOT NULL DEFAULT 'NEW',
          created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
          updated_at datetime DEFAULT NULL,
          assigned_at datetime DEFAULT NULL,
          PRIMARY KEY  (id)
      ) $charset_collate;";

      require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
      dbDelta($sql);
  }
  add_action('after_switch_theme', 'create_lawyer_requests_table');


  // [MODIFIED] Altcha challenge route added inside existing function
  function register_lawyer_requests_endpoint() {
      register_rest_route('lawyer/v1', '/requests', array(
          'methods' => 'GET',
          'callback' => 'get_lawyer_requests',
      ));

      // [ADDED] Altcha challenge endpoint
      register_rest_route( 'lawyer/v1', '/altcha-challenge', array(
          'methods'             => 'GET',
          'callback'            => 'generate_altcha_challenge',
          'permission_callback' => '__return_true',
      ));
  }
  add_action('rest_api_init', 'register_lawyer_requests_endpoint');

  function get_lawyer_requests() {
      global $wpdb;
      $table_name = $wpdb->prefix . 'lawyer_requests';
      $results = $wpdb->get_results("SELECT * FROM $table_name", OBJECT);
      return $results;
  }


  // ─── [ADDED] ALTCHA: CHALLENGE GENERATOR ────────────────
  function generate_altcha_challenge() {
      $hmac_secret = defined( 'ALTCHA_HMAC_SECRET' ) ? ALTCHA_HMAC_SECRET : '';
      if ( empty( $hmac_secret ) ) {
          return new WP_Error(
              'altcha_not_configured',
              'ALTCHA_HMAC_SECRET not defined',
              array( 'status' => 500 )
          );
      }

      $salt          = bin2hex( random_bytes( 12 ) );
      $max_number    = 50000;
      $secret_number = random_int( 1, $max_number );

      $challenge = hash( 'sha256', $salt . $secret_number );
      $signature = hash_hmac( 'sha256', $challenge, $hmac_secret );

      return rest_ensure_response( array(
          'algorithm' => 'SHA-256',
          'challenge' => $challenge,
          'maxnumber' => $max_number,
          'salt'      => $salt,
          'signature' => $signature,
      ));
  }

  // ─── [ADDED] ALTCHA: VERIFICATION ───────────────────────
  function verify_altcha_solution( $payload ) {
      if ( empty( $payload ) ) {
          return false;
      }

      $hmac_secret = defined( 'ALTCHA_HMAC_SECRET' ) ? ALTCHA_HMAC_SECRET : '';
      if ( empty( $hmac_secret ) ) {
          return false;
      }

      $decoded = json_decode( base64_decode( $payload ), true );
      if ( ! is_array( $decoded ) ) {
          return false;
      }

      $algorithm = isset( $decoded['algorithm'] ) ? $decoded['algorithm'] : '';
      $challenge = isset( $decoded['challenge'] ) ? $decoded['challenge'] : '';
      $number    = isset( $decoded['number'] )    ? $decoded['number']    : '';
      $salt      = isset( $decoded['salt'] )      ? $decoded['salt']      : '';
      $signature = isset( $decoded['signature'] ) ? $decoded['signature'] : '';

      if ( 'SHA-256' !== $algorithm ) {
          return false;
      }

      $expected_challenge = hash( 'sha256', $salt . $number );
      if ( ! hash_equals( $expected_challenge, $challenge ) ) {
          return false;
      }

      $expected_signature = hash_hmac( 'sha256', $challenge, $hmac_secret );
      if ( ! hash_equals( $expected_signature, $signature ) ) {
          return false;
      }

      return true;
  }
  
  
  /* ══════════════════════════════════════════════════════════════════════════
 * 587Lawyers — AI Intake Assistant (FAB + modal)
 * Pegar al final de functions.php. Se engancha a wp_body_open (Elementor-safe).
 * ══════════════════════════════════════════════════════════════════════════ */
function l587_assistant_render() {

	/* ---- Ajustes (edítalos aquí) ---------------------------------------- */
	$cfg_enabled    = true;   // false = pausa el bot sin borrar el código (admin control)
	$cfg_fab_bottom = 100;    // px desde abajo; libra el widget "Online" del chat existente
	$cfg_fab_right  = 24;     // px desde la derecha
	$cfg_z_index    = 2147483000;
	$cfg_nudge_ms   = 5000;   // globo de invitación; 0 = desactivado
	$cfg_api_base   = 'https://lawyersback.simpy.com.co';   // Base del backend 587Lawyers (NestJS). El asistente llama {base}/chatbot/message por turno; {base}/chatbot/leads como fallback. '' = modo demo (payload solo por consola).
	/* --------------------------------------------------------------------- */

	if ( ! $cfg_enabled || is_admin() || is_feed() ) {
		return;
	}

	/* Logo real del sitio — función reservada de WordPress (Custom Logo del
	   Customizer). Se usa en el header y el panel del chat; si no hay logo
	   configurado, cae a un monograma "587" sin romper nada. */
	$logo_id    = get_theme_mod( 'custom_logo' );
	$logo_url   = $logo_id ? wp_get_attachment_image_url( (int) $logo_id, 'full' ) : '';
	$has_logo   = ! empty( $logo_url );
	$root_class = $has_logo ? 'l587-has-logo' : '';

	$style = sprintf(
		'--l587-fab-bottom:%dpx;--l587-fab-right:%dpx;--l587-z:%d;',
		(int) $cfg_fab_bottom,
		(int) $cfg_fab_right,
		(int) $cfg_z_index
	);
	if ( $has_logo ) {
		$style .= "--l587-logo:url('" . esc_url( $logo_url ) . "');";
	}

	$boot = wp_json_encode(
		array(
			'nudgeDelay' => (int) $cfg_nudge_ms,
			'apiBase'    => (string) $cfg_api_base,
		)
	);
	?>
<div id="l587-root" class="<?php echo esc_attr( $root_class ); ?>" style="<?php echo esc_attr( $style ); ?>" data-boot="<?php echo esc_attr( $boot ); ?>">

	<!-- Globo de invitación -->
	<div class="l587-nudge" id="l587-nudge" hidden>
		<button class="l587-nudge__close" type="button" aria-label="Dismiss">&times;</button>
		<p class="l587-nudge__text">Not sure which lawyer you need?<br><span>Answer 4 questions — we'll route you.</span></p>
	</div>

	<!-- FAB -->
	<button class="l587-fab" id="l587-fab" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Open the AI legal assistant">
		<span class="l587-fab__halo" aria-hidden="true"></span>
		<span class="l587-fab__icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 3v3"/><path d="M6.5 6.5 4 14h5z"/><path d="M17.5 6.5 15 14h5z"/>
				<path d="M4 14a2.5 2.5 0 0 0 5 0"/><path d="M15 14a2.5 2.5 0 0 0 5 0"/>
				<path d="M5 6.5h14"/><path d="M12 6.5V20"/><path d="M8 20h8"/>
			</svg>
		</span>
		<span class="l587-fab__badge" aria-hidden="true">1</span>
	</button>

	<!-- Modal -->
	<div class="l587-overlay" id="l587-overlay" hidden>
		<div class="l587-modal" role="dialog" aria-modal="true" aria-labelledby="l587-title" id="l587-modal">

			<!-- Panel de identidad (visible en desktop) -->
			<aside class="l587-brand" aria-hidden="true">
				<div class="l587-brand__top">
					<?php if ( $has_logo ) : ?>
						<img class="l587-brand__logo" src="<?php echo esc_url( $logo_url ); ?>" alt="587 Lawyers">
					<?php else : ?>
						<span class="l587-brand__logo l587-brand__logo--txt">587</span>
					<?php endif; ?>
					<span class="l587-brand__pill"><i class="l587-dot"></i> Online now</span>
				</div>
				<div class="l587-brand__body">
					<h2 class="l587-brand__title">Let&rsquo;s find the right lawyer for your case.</h2>
					<p class="l587-brand__lead">Tell us what happened. A lawyer from our Alberta network personally reviews every inquiry &mdash; and reaches out, often the same day.</p>
					<ul class="l587-brand__list">
						<li><span class="l587-tick" aria-hidden="true">&#10003;</span> Reviewed by a real lawyer</li>
						<li><span class="l587-tick" aria-hidden="true">&#10003;</span> Private &amp; confidential</li>
						<li><span class="l587-tick" aria-hidden="true">&#10003;</span> Free to ask &mdash; no obligation</li>
					</ul>
				</div>
				<div class="l587-brand__foot">587&nbsp;Lawyers &middot; Alberta, Canada</div>
			</aside>

			<!-- Columna de chat -->
			<div class="l587-chat">
				<header class="l587-head">
					<div class="l587-head__id">
						<span class="l587-avatar" aria-hidden="true"><?php if ( $has_logo ) : ?><img src="<?php echo esc_url( $logo_url ); ?>" alt=""><?php else : ?>587<?php endif; ?></span>
						<span>
							<strong id="l587-title">587 Legal Assistant</strong>
							<em id="l587-status"><i class="l587-dot"></i>AI-guided intake &middot; Reviewed by a lawyer</em>
						</span>
					</div>
					<button class="l587-close" id="l587-close" type="button" aria-label="Close assistant">
						<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
					</button>
				</header>

				<div class="l587-progress" aria-hidden="true"><span id="l587-bar"></span></div>

				<div class="l587-log" id="l587-log" role="log" aria-live="polite" aria-atomic="false"></div>

				<div class="l587-input" id="l587-input"></div>

				<footer class="l587-foot">
					<span>Not legal advice. Your answers are shared only with 587&nbsp;Lawyers.</span>
				</footer>
			</div>
		</div>
	</div>
</div>

<style id="l587-css">
#l587-root{
	--navy:#1E3A5F; --navy-900:#132842; --navy-700:#294D77;
	--blue:#4A90D9; --blue-600:#2E6DB4;
	--ink:#20293A; --muted:#6B7686; --line:#E4E9F0;
	--surface:#FFFFFF; --canvas:#F5F8FC;
	--ok:#1F9D6B;
	--ui:"Poppins","Montserrat",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
	--mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
	--r:14px;
	position:fixed; inset:0; pointer-events:none; z-index:var(--l587-z);
	font-family:var(--ui);
}
#l587-root *{box-sizing:border-box}
#l587-root button{font-family:inherit}
/* El atributo [hidden] debe ganarle a cualquier display de clase. */
#l587-root [hidden]{display:none !important}

/* ---------- FAB ---------- */
.l587-fab{
	pointer-events:auto; position:absolute;
	bottom:var(--l587-fab-bottom); right:var(--l587-fab-right);
	width:62px; height:62px; border:0; border-radius:50%; cursor:pointer;
	background:linear-gradient(150deg,var(--navy-700),var(--navy) 55%,var(--navy-900));
	color:#fff; display:grid; place-items:center;
	box-shadow:0 10px 26px rgba(19,40,66,.34), 0 2px 6px rgba(19,40,66,.24);
	transition:transform .22s cubic-bezier(.2,.9,.3,1.2), box-shadow .22s ease;
}
.l587-fab:hover{transform:translateY(-3px) scale(1.04); box-shadow:0 16px 34px rgba(19,40,66,.4)}
.l587-fab:active{transform:scale(.96)}
.l587-fab:focus-visible{outline:3px solid var(--blue); outline-offset:3px}
.l587-fab__icon{display:grid; place-items:center; transition:transform .3s ease}
.l587-fab:hover .l587-fab__icon{transform:rotate(-8deg)}
.l587-fab__halo{
	position:absolute; inset:0; border-radius:50%; border:2px solid var(--blue);
	animation:l587-halo 2.8s ease-out infinite;
}
@keyframes l587-halo{
	0%{transform:scale(1); opacity:.55}
	70%{transform:scale(1.5); opacity:0}
	100%{opacity:0}
}
.l587-fab__badge{
	position:absolute; top:-2px; right:-2px; min-width:20px; height:20px; padding:0 5px;
	border-radius:10px; background:#E23E3E; color:#fff; font-size:11px; font-weight:700;
	display:grid; place-items:center; border:2px solid #fff;
}
#l587-root.is-open .l587-fab{transform:scale(.85); opacity:0; pointer-events:none}

/* ---------- Nudge ---------- */
.l587-nudge{
	pointer-events:auto; position:absolute;
	bottom:calc(var(--l587-fab-bottom) + 76px); right:var(--l587-fab-right);
	max-width:260px; background:var(--surface); border:1px solid var(--line);
	border-radius:var(--r); padding:14px 34px 14px 16px;
	box-shadow:0 12px 30px rgba(19,40,66,.18);
	animation:l587-pop .4s cubic-bezier(.2,.9,.3,1.2) both;
}
.l587-nudge::after{
	content:""; position:absolute; bottom:-7px; right:24px; width:14px; height:14px;
	background:var(--surface); border-right:1px solid var(--line); border-bottom:1px solid var(--line);
	transform:rotate(45deg);
}
.l587-nudge__text{margin:0; font-size:14px; line-height:1.45; color:var(--ink); font-weight:600}
.l587-nudge__text span{font-weight:400; color:var(--muted); font-size:13px}
.l587-nudge__close{
	position:absolute; top:6px; right:8px; background:none; border:0; cursor:pointer;
	font-size:20px; line-height:1; color:var(--muted); padding:2px 6px; border-radius:6px;
}
.l587-nudge__close:hover{background:var(--canvas); color:var(--ink)}
@keyframes l587-pop{from{opacity:0; transform:translateY(10px) scale(.96)} to{opacity:1; transform:none}}

/* ---------- Overlay + modal (casi pantalla completa, 2 paneles) ---------- */
.l587-overlay{
	pointer-events:auto; position:absolute; inset:0;
	background:radial-gradient(120% 120% at 72% 0%, rgba(30,58,95,.5), rgba(11,24,40,.74));
	backdrop-filter:blur(7px); -webkit-backdrop-filter:blur(7px);
	display:flex; align-items:center; justify-content:center;
	padding:clamp(0px, 3vh, 40px);
	animation:l587-fade .25s ease both;
}
@keyframes l587-fade{from{opacity:0} to{opacity:1}}
.l587-modal{
	width:min(1120px, 96vw); height:min(880px, 94vh);
	background:var(--surface); border-radius:24px; overflow:hidden;
	display:flex; flex-direction:row;
	box-shadow:0 40px 120px rgba(11,24,40,.5);
	animation:l587-rise .4s cubic-bezier(.2,.9,.3,1.05) both;
}
@keyframes l587-rise{from{opacity:0; transform:translateY(30px) scale(.985)} to{opacity:1; transform:none}}

/* Panel de identidad (izquierda) — da la sensación de un despacho real */
.l587-brand{
	flex:0 0 40%; max-width:440px; position:relative; overflow:hidden;
	display:flex; flex-direction:column; justify-content:space-between; gap:24px;
	padding:40px 36px;
	background:linear-gradient(160deg, var(--navy-700) 0%, var(--navy) 44%, var(--navy-900) 100%);
	color:#EAF1FB;
}
.l587-brand::after{
	content:""; position:absolute; inset:0; pointer-events:none; opacity:.55;
	background:
		radial-gradient(60% 45% at 88% 6%, rgba(74,144,217,.38), transparent 70%),
		radial-gradient(52% 42% at -5% 102%, rgba(84,211,154,.18), transparent 70%);
}
.l587-brand > *{position:relative; z-index:1}
.l587-brand__top{display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap}
.l587-brand__logo{
	max-width:180px; max-height:58px; width:auto; height:auto; object-fit:contain;
	background:#fff; padding:11px 16px; border-radius:14px;
	box-shadow:0 12px 32px rgba(0,0,0,.24);
}
.l587-brand__logo--txt{
	display:grid; place-items:center; width:58px; height:58px; border-radius:16px; padding:0;
	font-size:16px; font-weight:800; letter-spacing:.5px; color:var(--navy);
}
.l587-brand__pill{
	display:inline-flex; align-items:center; gap:7px; padding:7px 13px; border-radius:999px;
	background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.18);
	font-size:11.5px; font-weight:600; color:#DCE9F8; white-space:nowrap;
}
.l587-brand__title{
	margin:0 0 14px; font-size:clamp(24px, 2.3vw, 32px); line-height:1.16; font-weight:700;
	letter-spacing:-.4px; color:#fff;
}
.l587-brand__lead{margin:0; font-size:15px; line-height:1.62; color:#C6D6EA; max-width:36ch}
.l587-brand__list{list-style:none; margin:24px 0 0; padding:0; display:flex; flex-direction:column; gap:13px}
.l587-brand__list li{display:flex; align-items:center; gap:12px; font-size:14.5px; color:#E4EDF8; font-weight:500}
.l587-tick{
	flex:0 0 22px; width:22px; height:22px; border-radius:50%;
	display:grid; place-items:center; font-size:12px; font-weight:700;
	background:rgba(84,211,154,.16); color:#7DE3B4; border:1px solid rgba(84,211,154,.32);
}
.l587-brand__foot{font-size:12px; letter-spacing:.3px; color:#8FA9C8}

/* Columna de chat (derecha) */
.l587-chat{flex:1 1 auto; min-width:0; display:flex; flex-direction:column; background:var(--surface)}

.l587-head{
	background:var(--surface); border-bottom:1px solid var(--line);
	color:var(--ink); padding:16px 16px 16px 22px;
	display:flex; align-items:center; justify-content:space-between; gap:12px;
}
.l587-head__id{display:flex; align-items:center; gap:13px; min-width:0}
.l587-head__id strong{display:block; font-size:16px; font-weight:700; letter-spacing:-.1px; color:var(--ink)}
.l587-head__id em{display:flex; align-items:center; gap:6px; font-style:normal; font-size:12px; color:var(--muted); margin-top:2px}
.l587-avatar{
	width:42px; height:42px; flex:0 0 42px; border-radius:13px; overflow:hidden;
	background:linear-gradient(150deg,var(--navy-700),var(--navy)); color:#fff;
	border:1px solid var(--line);
	display:grid; place-items:center; font-size:13px; font-weight:800; letter-spacing:.4px;
	box-shadow:0 2px 6px rgba(19,40,66,.14);
}
.l587-avatar img{width:100%; height:100%; object-fit:contain; background:#fff; padding:5px}
.l587-dot{width:7px; height:7px; border-radius:50%; background:#1F9D6B; box-shadow:0 0 0 0 rgba(31,157,107,.55); animation:l587-pulse 2s infinite}
@keyframes l587-pulse{70%{box-shadow:0 0 0 7px rgba(31,157,107,0)} 100%{box-shadow:0 0 0 0 rgba(31,157,107,0)}}
.l587-close{background:var(--canvas); border:1px solid var(--line); color:var(--muted); cursor:pointer; padding:8px; border-radius:10px; display:grid; place-items:center; transition:all .16s ease}
.l587-close:hover{background:#fff; color:var(--ink); border-color:#CBD6E4}
.l587-close:focus-visible{outline:2px solid var(--blue); outline-offset:2px}

.l587-progress{height:3px; background:var(--line)}
.l587-progress span{display:block; height:100%; width:0; background:linear-gradient(90deg,var(--blue),var(--navy)); transition:width .45s ease}

.l587-log{flex:1; overflow-y:auto; padding:28px clamp(18px,4%,44px) 14px; background:var(--canvas); scroll-behavior:smooth}
.l587-log::-webkit-scrollbar{width:8px}
.l587-log::-webkit-scrollbar-thumb{background:#CBD6E4; border-radius:4px}
.l587-log::-webkit-scrollbar-thumb:hover{background:#B4C3D6}

/* Burbujas */
.l587-msg{max-width:80%; margin-bottom:16px; animation:l587-in .3s ease both}
.l587-msg--bot{display:flex; align-items:flex-end; gap:10px}
/* Avatar con el logo real del sitio en cada mensaje del asistente (solo si hay logo). */
#l587-root.l587-has-logo .l587-msg--bot::before{
	content:""; flex:0 0 30px; width:30px; height:30px; border-radius:10px; align-self:flex-start;
	background:var(--l587-logo) center/68% no-repeat, #fff;
	border:1px solid var(--line); box-shadow:0 1px 3px rgba(19,40,66,.08);
}
.l587-msg--bot .l587-bubble{
	background:var(--surface); color:var(--ink); border:1px solid var(--line);
	border-radius:4px 16px 16px 16px; padding:13px 16px; font-size:15px; line-height:1.55;
	box-shadow:0 2px 8px rgba(19,40,66,.06);
}
.l587-msg--user{margin-left:auto}
.l587-msg--user .l587-bubble{
	background:linear-gradient(160deg,var(--navy-700),var(--navy)); color:#fff;
	border-radius:16px 4px 16px 16px; padding:13px 16px; font-size:15px; line-height:1.55;
	box-shadow:0 6px 18px rgba(19,40,66,.22);
}
@keyframes l587-in{from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none}}

.l587-typing{display:inline-flex; gap:5px; padding:15px 16px}
.l587-typing i{width:8px; height:8px; border-radius:50%; background:#A9B7C9; animation:l587-bounce 1.2s infinite}
.l587-typing i:nth-child(2){animation-delay:.15s}
.l587-typing i:nth-child(3){animation-delay:.3s}
@keyframes l587-bounce{0%,60%,100%{transform:translateY(0); opacity:.5} 30%{transform:translateY(-5px); opacity:1}}

/* Panel de análisis — elemento firma */
.l587-analysis{
	background:var(--navy-900); color:#DCE7F4; border-radius:14px; padding:16px;
	margin:4px 0 12px; font-family:var(--mono); font-size:12px;
	animation:l587-in .3s ease both;
}
.l587-analysis h4{
	margin:0 0 12px; font-family:var(--ui); font-size:11px; font-weight:600;
	letter-spacing:1.4px; text-transform:uppercase; color:#7FA5CC;
}
.l587-step{display:flex; align-items:flex-start; gap:9px; padding:5px 0; opacity:.32; transition:opacity .3s ease}
.l587-step.is-active{opacity:1}
.l587-step.is-done{opacity:.8}
.l587-step__mark{width:13px; flex:0 0 13px; margin-top:1px; color:#4A90D9}
.l587-step.is-done .l587-step__mark{color:#54D39A}
.l587-step__mark::before{content:"›"}
.l587-step.is-active .l587-step__mark::before{content:"▸"}
.l587-step.is-done .l587-step__mark::before{content:"✓"}
.l587-step__label{line-height:1.4}
.l587-step.is-active .l587-step__label::after{content:"▌"; animation:l587-caret .8s steps(2) infinite; margin-left:2px}
@keyframes l587-caret{0%,50%{opacity:1} 51%,100%{opacity:0}}

/* Tarjeta de confirmación */
.l587-card{
	background:var(--surface); border:1px solid var(--line); border-left:3px solid var(--ok);
	border-radius:12px; padding:16px; margin-bottom:12px; animation:l587-in .3s ease both;
}
.l587-card h4{margin:0 0 6px; font-size:15px; color:var(--ink)}
.l587-card p{margin:0 0 10px; font-size:13.5px; line-height:1.55; color:var(--muted)}
.l587-card dl{margin:0; display:grid; grid-template-columns:auto 1fr; gap:5px 12px; font-size:12.5px}
.l587-card dt{color:var(--muted)}
.l587-card dd{margin:0; color:var(--ink); font-weight:600; font-family:var(--mono)}

/* ---------- Zona de entrada ---------- */
.l587-input{background:var(--surface); border-top:1px solid var(--line); padding:16px clamp(16px,4%,32px)}
.l587-input:empty{display:none}
.l587-chips{display:flex; flex-wrap:wrap; gap:9px; margin-bottom:4px}
.l587-chip{
	background:var(--surface); border:1.5px solid var(--line); color:var(--navy);
	border-radius:999px; padding:10px 16px; font-size:14px; font-weight:600; cursor:pointer;
	transition:all .18s ease; animation:l587-in .28s ease both;
}
.l587-chip:hover{border-color:var(--navy); background:var(--navy); color:#fff; transform:translateY(-1px); box-shadow:0 6px 16px rgba(19,40,66,.18)}
.l587-chip:focus-visible{outline:2px solid var(--blue); outline-offset:2px}

.l587-field{margin-bottom:10px}
.l587-field label{display:block; font-size:12px; font-weight:600; color:var(--muted); margin-bottom:5px}
.l587-field input, .l587-field textarea{
	width:100%; border:1.5px solid var(--line); border-radius:12px; padding:13px 15px;
	font-size:15px; font-family:inherit; color:var(--ink); background:var(--canvas); transition:border-color .18s ease, box-shadow .18s ease, background .18s ease;
}
.l587-field textarea{resize:vertical; min-height:88px; line-height:1.5}
.l587-field input:focus, .l587-field textarea:focus{outline:0; border-color:var(--navy); background:#fff; box-shadow:0 0 0 4px rgba(30,58,95,.08)}
.l587-field.has-error input, .l587-field.has-error textarea{border-color:#E23E3E}
.l587-error{display:block; font-size:11.5px; color:#E23E3E; margin-top:4px}
.l587-consent{display:flex; gap:10px; align-items:flex-start; font-size:12.5px; color:var(--muted); line-height:1.5; margin:2px 0 14px; cursor:pointer}
.l587-consent input{width:17px; height:17px; flex:0 0 17px; margin-top:1px; accent-color:var(--navy)}
.l587-send{
	width:100%; border:0; border-radius:13px; padding:15px; cursor:pointer;
	background:linear-gradient(160deg,var(--navy-700),var(--navy)); color:#fff; font-size:15px; font-weight:700; letter-spacing:.2px;
	box-shadow:0 8px 22px rgba(19,40,66,.24); transition:background .18s ease, transform .18s ease, box-shadow .18s ease;
}
.l587-send:hover{background:linear-gradient(160deg,var(--navy),var(--navy-900)); transform:translateY(-1px); box-shadow:0 12px 28px rgba(19,40,66,.3)}
.l587-send:focus-visible{outline:2px solid var(--blue); outline-offset:2px}
.l587-send[disabled]{opacity:.45; cursor:not-allowed; transform:none; box-shadow:none}
.l587-restart{
	width:100%; border:1.5px solid var(--line); background:var(--surface); color:var(--navy);
	border-radius:13px; padding:13px; font-size:14px; font-weight:600; cursor:pointer; transition:border-color .16s ease, background .16s ease;
}
.l587-restart:hover{border-color:var(--navy); background:var(--canvas)}

.l587-foot{padding:11px 16px; background:var(--surface); border-top:1px solid var(--line); text-align:center}
.l587-foot span{font-size:11px; color:var(--muted)}

/* ---------- Responsive ---------- */
@media (max-width:920px){
	.l587-brand{display:none}
	.l587-modal{width:min(560px, 96vw); height:min(840px, 94vh)}
}
@media (max-width:560px){
	.l587-overlay{padding:0; align-items:stretch; justify-content:stretch}
	.l587-modal{width:100%; height:100%; height:100dvh; border-radius:0; max-width:none}
	.l587-nudge{max-width:calc(100vw - 48px)}
	.l587-log{padding:20px 16px 12px}
}

/* ---------- Accesibilidad ---------- */
@media (prefers-reduced-motion:reduce){
	#l587-root *, #l587-root *::before, #l587-root *::after{
		animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important;
	}
}
</style>

<script id="l587-js">
(function () {
	"use strict";

	/* =========================================================================
	 * 587Lawyers — Asistente de intake CONVERSACIONAL (AI real vía backend)
	 * En CADA turno llama {apiBase}/chatbot/message: el backend (Claude) conduce
	 * la conversación y crea el lead cuando reúne datos suficientes. Sin guiones
	 * hardcodeados ni clasificación en el cliente. Fallback a captura de contacto
	 * ({apiBase}/chatbot/leads) si el backend no responde. DOM construido con
	 * textContent (sin innerHTML) → sin superficie XSS desde texto del usuario/AI.
	 * =======================================================================*/
	var root = document.getElementById("l587-root");
	if (!root) { return; }

	var boot      = JSON.parse(root.getAttribute("data-boot") || "{}");
	var API_BASE  = String(boot.apiBase || "").replace(/\/+$/, "");
	var MSG_URL   = API_BASE ? API_BASE + "/chatbot/message" : "";
	var LEADS_URL = API_BASE ? API_BASE + "/chatbot/leads"   : "";

	var fab     = document.getElementById("l587-fab");
	var overlay = document.getElementById("l587-overlay");
	var modal   = document.getElementById("l587-modal");
	var closeBt = document.getElementById("l587-close");
	var log     = document.getElementById("l587-log");
	var inputEl = document.getElementById("l587-input");
	var bar     = document.getElementById("l587-bar");
	var nudge   = document.getElementById("l587-nudge");

	/* Saludo inicial estático (respuesta instantánea al abrir). El resto de la
	   conversación la genera el backend; esto NO son respuestas "canned". */
	var GREETING = [
		"Hi — I'm the 587Lawyers intake assistant.",
		"Tell me in a few words what's going on and I'll help figure out the right kind of lawyer for you in Alberta. A real lawyer from our network then reviews your case and contacts you."
	];

	/* Sugerencias de arranque: al pulsarlas se ENVÍAN como mensaje del usuario al AI. */
	var STARTERS = [
		"I was injured in an accident",
		"I have a family / divorce matter",
		"I'm facing a criminal charge",
		"I have an employment issue",
		"A business / corporate matter",
		"Immigration",
		"Something else"
	];

	var CONSENT_TEXT = "I agree that 587Lawyers may contact me about my inquiry, and I understand this is an AI-assisted intake — not legal advice.";

	var state = {
		started: false,
		messages: [],   // [{ role:'user'|'assistant', content }]
		sessionId: "587-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
		startedAt: null,
		consent: false,
		done: false,
		busy: false,
		turns: 0,
		nudgeDismissed: false,
		lastFocus: null
	};

	/* Crea un elemento; el texto se asigna con textContent (auto-escapado). */
	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) { n.className = cls; }
		if (text != null) { n.textContent = text; }
		return n;
	}

	function empty(node) { while (node.firstChild) { node.removeChild(node.firstChild); } }

	function scroll() { log.scrollTop = log.scrollHeight; }

	function progress() {
		/* Barra indicativa: avanza con los turnos, tope 90% hasta el cierre. */
		bar.style.width = Math.min(90, 12 + state.turns * 14) + "%";
	}

	function bubble(role, text) {
		var wrap = el("div", "l587-msg l587-msg--" + (role === "user" ? "user" : "bot"));
		wrap.appendChild(el("div", "l587-bubble", text));
		log.appendChild(wrap);
		scroll();
		return wrap;
	}

	var typingNode = null;
	function typingShow() {
		if (typingNode) { return; }
		typingNode = el("div", "l587-msg l587-msg--bot");
		var b = el("div", "l587-bubble l587-typing");
		b.appendChild(document.createElement("i"));
		b.appendChild(document.createElement("i"));
		b.appendChild(document.createElement("i"));
		typingNode.appendChild(b);
		log.appendChild(typingNode);
		scroll();
	}
	function typingHide() { if (typingNode) { typingNode.remove(); typingNode = null; } }

	function clearInput() { empty(inputEl); }

	/* Encola los mensajes locales del saludo con un retardo natural. */
	function sayLocal(list, done) {
		var queue = list.slice();
		(function next() {
			if (!queue.length) { return done && done(); }
			var text = queue.shift();
			typingShow();
			setTimeout(function () {
				typingHide();
				bubble("bot", text);
				next();
			}, Math.min(1000, 300 + text.length * 10));
		})();
	}

	function setBusy(b) {
		state.busy = b;
		var send = inputEl.querySelector(".l587-send");
		if (send) { send.disabled = b; }
		var ta = inputEl.querySelector("textarea");
		if (ta) { ta.disabled = b; }
	}

	/* ---- Puerta de consentimiento (antes del primer mensaje) ---- */
	function renderConsentGate() {
		clearInput();
		var consent = el("label", "l587-consent");
		var chk = el("input"); chk.type = "checkbox";
		consent.appendChild(chk);
		consent.appendChild(el("span", null, CONSENT_TEXT));

		var btn = el("button", "l587-send", "Start");
		btn.type = "button";
		btn.disabled = true;
		chk.addEventListener("change", function () { btn.disabled = !chk.checked; });
		btn.addEventListener("click", function () {
			if (!chk.checked) { return; }
			state.consent = true;
			renderComposer(true);
		});

		inputEl.appendChild(consent);
		inputEl.appendChild(btn);
	}

	/* ---- Composer de texto libre (+ sugerencias en el primer turno) ---- */
	function renderComposer(showStarters) {
		clearInput();

		if (showStarters) {
			var chips = el("div", "l587-chips");
			STARTERS.forEach(function (label, i) {
				var b = el("button", "l587-chip", label);
				b.type = "button";
				b.style.animationDelay = (i * 40) + "ms";
				b.addEventListener("click", function () { sendUser(label); });
				chips.appendChild(b);
			});
			inputEl.appendChild(chips);
		}

		var field = el("div", "l587-field");
		var ta = el("textarea");
		ta.placeholder = "Type your message…";
		ta.setAttribute("aria-label", "Your message");
		ta.rows = 2;
		field.appendChild(ta);

		var btn = el("button", "l587-send", "Send");
		btn.type = "button";

		function submit() {
			var val = ta.value.trim();
			if (!val) { return; }
			sendUser(val);
		}
		btn.addEventListener("click", submit);
		ta.addEventListener("keydown", function (e) {
			if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
		});

		inputEl.appendChild(field);
		inputEl.appendChild(btn);
		ta.focus();
	}

	/* ---- Un turno del usuario → backend conversacional ---- */
	function sendUser(text) {
		if (state.busy || state.done) { return; }
		bubble("user", text);
		state.messages.push({ role: "user", content: text });
		state.turns++;
		clearInput();
		callBackend();
	}

	function callBackend() {
		if (!MSG_URL) {
			fallbackToContact("The assistant is in demo mode. Please leave your details and a lawyer will reach out.");
			return;
		}
		setBusy(true);
		typingShow();
		progress();
		fetch(MSG_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				sessionId: state.sessionId,
				messages: state.messages,
				page: window.location.href,
				language: (navigator.language || "en").slice(0, 2)
			})
		}).then(function (r) {
			return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status));
		}).then(function (data) {
			typingHide();
			setBusy(false);
			var reply = (data && data.reply) ? String(data.reply) : "";
			if (reply) {
				bubble("bot", reply);
				state.messages.push({ role: "assistant", content: reply });
			}
			if (data && data.done) {
				finish(data);
			} else {
				renderComposer(false);
			}
		}).catch(function () {
			typingHide();
			setBusy(false);
			fallbackToContact("Sorry — our assistant is briefly unavailable. Please leave your name, email and phone and a lawyer from our Alberta network will reach out.");
		});
	}

	/* ---- Fallback: si el backend no responde, capturar contacto → /chatbot/leads ---- */
	function fallbackToContact(message) {
		if (message) { bubble("bot", message); }
		clearInput();
		var box = el("div");
		var defs = [
			{ name: "name",  label: "Full name",         type: "text",  ac: "name" },
			{ name: "email", label: "Email",             type: "email", ac: "email" },
			{ name: "phone", label: "Phone (Canada/US)", type: "tel",   ac: "tel" }
		];
		var inputs = {};
		defs.forEach(function (f) {
			var field = el("div", "l587-field");
			var lb = el("label", null, f.label);
			var inp = el("input"); inp.type = f.type; inp.autocomplete = f.ac;
			field.appendChild(lb); field.appendChild(inp);
			box.appendChild(field);
			inputs[f.name] = { input: inp, field: field };
		});

		var btn = el("button", "l587-send", "Send to a lawyer");
		btn.type = "button";
		btn.addEventListener("click", function () {
			var name  = inputs.name.input.value.trim();
			var email = inputs.email.input.value.trim();
			var phone = inputs.phone.input.value.trim();
			var ok = true;
			function mark(k, bad) { inputs[k].field.classList.toggle("has-error", bad); if (bad) { ok = false; } }
			mark("name",  name.length < 2);
			mark("email", !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email));
			mark("phone", phone.replace(/\D/g, "").length < 10);
			if (!ok) { return; }

			var summary = state.messages
				.filter(function (m) { return m.role === "user"; })
				.map(function (m) { return m.content; })
				.join(" ") || "Website assistant inquiry.";

			var payload = {
				sessionId: state.sessionId,
				source: "wordpress-fab-assistant",
				page: window.location.href,
				startedAt: state.startedAt,
				completedAt: new Date().toISOString(),
				contact: { name: name, email: email, phone: phone },
				consent: true,
				answers: { service: "other", summary: summary },
				transcript: state.messages.map(function (m) { return { role: m.role, text: m.content }; })
			};

			clearInput();
			postLead(payload);
		});

		inputEl.appendChild(box);
		inputEl.appendChild(btn);
	}

	function postLead(payload) {
		typingShow();
		if (!LEADS_URL) { typingHide(); finish({ reference: state.sessionId.toUpperCase() }); return; }
		fetch(LEADS_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		}).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
		  .then(function (res) { typingHide(); finish(res || { reference: state.sessionId.toUpperCase() }); })
		  .catch(function () {
			typingHide();
			bubble("bot", "We couldn't submit right now. Please try again in a moment, or call us directly.");
			var retry = el("button", "l587-restart", "Try again");
			retry.type = "button";
			retry.addEventListener("click", function () { clearInput(); postLead(payload); });
			inputEl.appendChild(retry);
		});
	}

	/* ---- Cierre ---- */
	function finish(data) {
		state.done = true;
		clearInput();
		var ref = (data && data.reference) ? String(data.reference) : state.sessionId.toUpperCase();
		var card = el("div", "l587-card");
		card.appendChild(el("h4", null, "You're in the queue."));
		card.appendChild(el("p", null, "A lawyer from our Alberta network will contact you shortly. Your conversation is attached to your file, so you won't have to repeat yourself."));
		var dl = el("dl");
		dl.appendChild(el("dt", null, "Reference"));
		dl.appendChild(el("dd", null, ref));
		card.appendChild(dl);
		log.appendChild(card);
		try { document.dispatchEvent(new CustomEvent("l587:lead", { detail: { sessionId: state.sessionId, reference: ref } })); } catch (e) {}
		scroll();
		bar.style.width = "100%";

		var again = el("button", "l587-restart", "Start a new inquiry");
		again.type = "button";
		again.addEventListener("click", reset);
		inputEl.appendChild(again);
	}

	/* ---- Ciclo de vida ---- */
	function start() {
		if (state.started) { return; }
		state.started = true;
		state.startedAt = new Date().toISOString();
		progress();
		sayLocal(GREETING, function () { renderConsentGate(); });
	}

	function reset() {
		state.started = false;
		state.messages = [];
		state.consent = false;
		state.done = false;
		state.busy = false;
		state.turns = 0;
		state.sessionId = "587-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
		empty(log);
		clearInput();
		bar.style.width = "0";
		start();
	}

	function open() {
		state.lastFocus = document.activeElement;
		overlay.hidden = false;
		root.classList.add("is-open");
		fab.setAttribute("aria-expanded", "true");
		hideNudge();
		start();
		setTimeout(function () { (inputEl.querySelector("button, input, textarea") || closeBt).focus(); }, 380);
	}

	function close() {
		overlay.hidden = true;
		root.classList.remove("is-open");
		fab.setAttribute("aria-expanded", "false");
		if (state.lastFocus) { state.lastFocus.focus(); }
	}

	function hideNudge() {
		state.nudgeDismissed = true;
		nudge.hidden = true;
	}

	fab.addEventListener("click", open);
	closeBt.addEventListener("click", close);
	overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) { close(); } });

	document.addEventListener("keydown", function (e) {
		if (overlay.hidden) { return; }
		if (e.key === "Escape") { close(); return; }
		if (e.key !== "Tab") { return; }
		var f = modal.querySelectorAll('button, input, textarea, [href], [tabindex]:not([tabindex="-1"])');
		if (!f.length) { return; }
		var first = f[0], last = f[f.length - 1];
		if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
		else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
	});

	nudge.querySelector(".l587-nudge__close").addEventListener("click", function (e) {
		e.stopPropagation();
		hideNudge();
	});
	nudge.addEventListener("click", open);

	if (boot.nudgeDelay > 0) {
		setTimeout(function () {
			if (!state.nudgeDismissed && overlay.hidden) { nudge.hidden = false; }
		}, boot.nudgeDelay);
	}
})();
</script>
	<?php
}

/* Engancha en el <body> (funciona con plantillas Elementor Canvas/Full Width). */
add_action( 'wp_body_open', 'l587_assistant_render', 99 );
/* Fallback: si el tema no soporta wp_body_open, usa wp_footer. */
add_action( 'wp_footer', function () {
	if ( ! did_action( 'wp_body_open' ) ) { l587_assistant_render(); }
}, 99 );
  
  
  
  
  
  
  
  