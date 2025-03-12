# MD Text Extraction System

## Overview
This system now uses PHP to extract text directly from Markdown (.md) files instead of using Python to extract text from PDF files. This change makes the system more compatible with PHP-only hosting environments.

## Changes Made
1. Modified `lib/pdf_parser.php` to:
   - Remove Python dependency
   - Add direct Markdown file reading
   - Keep the same API interface for compatibility
   - Fall back to PDF files if MD files aren't available

2. Updated `lib/config.php` to:
   - Remove Python script reference
   - Update comments

3. Updated API endpoints to work with both file types:
   - `api/navigation/questions.php` now lists both .md and .pdf files
   - `api/navigation/suggestions.php` now suggests both .md and .pdf files
   - `api/pdf/extract.php` uses the updated parser to handle both formats

## File Format Priority
The system now prioritizes files in this order:
1. First looks for .md files (preferred format)
2. Falls back to .pdf files if .md files aren't available

## How to Test the Changes

### Running the Test Script
1. Access the test script in your browser:
   ```
   http://localhost/Main/test_md_extraction.php
   ```

2. Or run it from the command line:
   ```
   php test_md_extraction.php
   ```

3. The test script will:
   - Create a sample Markdown file
   - Test the extraction process
   - Display the results

### Using in Your Application
The API remains unchanged, so any existing code that calls the PDFParser class will continue to work. The only difference is that it will prioritize .md files over .pdf files.

Example usage:
```php
$parser = new PDFParser();
$result = $parser->extractText('grade', 'subject', 'chapter', 'question_name');
$text = $result['text']; // Extracted text
```

## Converting Your PDFs
See the `PDF_TO_MD_CONVERSION_GUIDE.md` file for detailed instructions on converting your existing PDF files to Markdown format.

## Troubleshooting
If you encounter issues:
1. Check that your Markdown files exist at the expected path
2. Ensure the file permissions allow PHP to read the files
3. Check error logs for specific error messages