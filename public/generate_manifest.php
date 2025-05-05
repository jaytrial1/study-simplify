<?php

// Function to safely get server variables
function getServerVar($key, $default = null) {
    return isset($_SERVER[$key]) ? $_SERVER[$key] : $default;
}

// Get the hostname
$host = getServerVar('HTTP_HOST', 'localhost');
$protocol = (getServerVar('HTTPS') === 'on' || getServerVar('HTTP_X_FORWARDED_PROTO') === 'https') ? 'https' : 'http';
$base_url = $protocol . '://' . $host;

// --- Subdomain Detection ---
$subdomain = null;
$is_subdomain = false;
$matches = [];

// Check for production subdomain (e.g., classa.studysimplify.in)
if (preg_match('/^([a-z0-9-]+)\.studysimplify\.in$/i', $host, $matches)) {
    $subdomain = $matches[1];
    $is_subdomain = true;
} 
// Check for local subdomain (e.g., classa.localhost)
elseif (preg_match('/^([a-z0-9-]+)\.localhost$/i', $host, $matches)) {
    $subdomain = $matches[1];
    $is_subdomain = true;
}
// Add other local testing domains if needed (e.g., *.local, *.test)
// elseif (preg_match('/^([a-z0-9-]+)\.yourlocaltld$/i', $host, $matches)) {
//     $subdomain = $matches[1];
//     $is_subdomain = true;
// }

// --- Manifest Defaults ---
$manifest = [
    'name' => 'Study Simplify Assistant',
    'short_name' => 'StudyAssist',
    'description' => 'Your personal study assistant.',
    'start_url' => '/public/html/login.html', // Default start URL
    'display' => 'standalone',
    'background_color' => '#ffffff',
    'theme_color' => '#1e1f24', // Match HTML theme-color meta tag
    'icons' => [
        [
            'src' => '/public/images/icons/icon-192x192.png', // Default icon
            'sizes' => '192x192',
            'type' => 'image/png',
            'purpose' => 'any'
        ],
        [
            'src' => '/public/images/icons/icon-512x512.png', // Default icon
            'sizes' => '512x512',
            'type' => 'image/png',
            'purpose' => 'any'
        ]
    ]
];

// --- Subdomain Overrides ---
if ($is_subdomain && $subdomain) {
    error_log("PWA Manifest: Detected subdomain: " . $subdomain);
    $subdomain_dir = dirname(__DIR__) . '/subdomain/' . $subdomain; // Relative to htdocs/main
    error_log("PWA Manifest: Checking subdomain directory: " . $subdomain_dir);

    $title_file = $subdomain_dir . '/title.txt';
    $logo_file_relative_path = '/subdomain/' . $subdomain . '/logo.png'; // Path relative to web root
    $logo_file_system_path = $subdomain_dir . '/logo.png';
    error_log("PWA Manifest: Checking title file: " . $title_file);
    error_log("PWA Manifest: Checking logo file system path: " . $logo_file_system_path);
    error_log("PWA Manifest: Logo relative path will be: " . $logo_file_relative_path);

    $app_name = 'Study Simplify (' . ucfirst($subdomain) . ')'; // Default if title file not found
    $short_name = ucfirst($subdomain); // Default short name

    // Check if title file exists and read it
    if (file_exists($title_file)) {
        error_log("PWA Manifest: Title file found.");
        if (is_readable($title_file)) {
            error_log("PWA Manifest: Title file is readable.");
            $title_content = trim(file_get_contents($title_file));
            if (!empty($title_content)) {
                $app_name = $title_content;
                $short_name = (strlen($app_name) > 12) ? substr($app_name, 0, 9) . '...' : $app_name; 
                error_log("PWA Manifest: Using title from file: " . $app_name);
            } else {
                error_log("PWA Manifest: Title file is empty. Using default name.");
            }
        } else {
            error_log("PWA Manifest: Title file found BUT NOT READABLE. Check permissions. Using default name.");
        }
    } else {
        error_log("PWA Manifest: Title file NOT FOUND at " . $title_file . ". Using default name.");
    }

    // Check if logo file exists
    $logo_exists = file_exists($logo_file_system_path);
    error_log("PWA Manifest: Logo file exists check result: " . ($logo_exists ? 'true' : 'false'));
    
    // Override manifest values for subdomain
    $manifest['name'] = $app_name;
    $manifest['short_name'] = $short_name;
    // start_url should point to the tuition home for subdomains
    $manifest['start_url'] = '/public/html/tuition_home.html'; 
    $manifest['description'] = 'Study assistant for ' . ucfirst($subdomain);

    // Only override icons if the logo file exists
    if ($logo_exists) {
         error_log("PWA Manifest: Logo file found. Overriding icons.");
         // User confirmed they will resize logo.png to 512x512
        $manifest['icons'] = [
            [
                'src' => $logo_file_relative_path, // Dynamic logo path
                'sizes' => '192x192', // Define standard sizes
                'type' => 'image/png',
                 'purpose' => 'any'
            ],
             [
                'src' => $logo_file_relative_path, // Dynamic logo path
                'sizes' => '512x512', // Define standard sizes
                'type' => 'image/png',
                 'purpose' => 'any'
            ]
            // Add more sizes if you create specific resized versions
        ];
    } else {
        // Keep default icons if subdomain logo is missing
        error_log("PWA Manifest: Logo not found at " . $logo_file_system_path . " for subdomain " . $subdomain . ". Using default icons.");
    }

    // Add subdomain scope if needed, ensures PWA only handles URLs within the subdomain
    // $manifest['scope'] = $base_url . '/'; // This might be too restrictive depending on API calls

} else {
    // Specific logic for main domain if needed (e.g., different start_url)
    // $manifest['start_url'] = '/public/html/login.html'; // Main domain starts at login
     error_log("PWA Manifest: Not a detected subdomain (Host: " . $host . "). Using default manifest.");
}


// --- Output JSON ---
header('Content-Type: application/manifest+json');
header('Cache-Control: no-cache, must-revalidate'); // Prevent caching of the dynamic manifest
header('Expires: 0');
echo json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

?> 