<?php
class PDFParser {
    protected $pdfRoot;

    public function __construct() {
        // Get the absolute path to the project root
        $projectRoot = dirname(dirname(__FILE__));
        
        // Set default paths relative to project root
        $this->pdfRoot = $projectRoot . '/public/pdf_repository/';
        
        // Validate paths on construction
        if (!is_dir($this->pdfRoot)) {
            error_log("Repository directory not found: " . $this->pdfRoot);
            throw new Exception("Repository directory not found");
        }
    }

    public function extractText($grade, $subject, $chapter, $questionName) {
        // Handle both single question and array of questions
        if (is_array($questionName)) {
            return $this->extractMultipleTexts($grade, $subject, $chapter, $questionName);
        }

        // First, check if an MD file exists (our preferred format)
        $mdPath = $this->pdfRoot . "$grade/$subject/$chapter/$questionName.md";
        
        // Then check if a PDF file exists (legacy format)
        $pdfPath = $this->pdfRoot . "$grade/$subject/$chapter/$questionName.pdf";
        
        // Try MD file first
        if (file_exists($mdPath)) {
            error_log("Reading MD file from: " . $mdPath);
            return $this->extractFromMarkdown($mdPath);
        }
        // Fall back to PDF file if available and MD not found
        else if (file_exists($pdfPath)) {
            error_log("MD file not found, falling back to PDF at: " . $pdfPath);
            return $this->extractFromPDF($pdfPath);
        }
        else {
            error_log("No file found at: " . $mdPath . " or " . $pdfPath);
            throw new Exception("No file found at: " . $mdPath);
        }
    }
    
    protected function extractFromMarkdown($filePath) {
        try {
            // For MD files, we can simply read the file
            $text = file_get_contents($filePath);
            
            if ($text === false) {
                throw new Exception("Failed to read MD file");
            }
            
            // Get file stats
            $fileStats = stat($filePath);
            
            // Count pages by estimating (each ~3000 chars as a page)
            $estimatedPages = max(1, ceil(strlen($text) / 3000));
            
            return [
                'success' => true,
                'text' => $text,
                'pages' => $estimatedPages,
                'size' => $fileStats['size']
            ];
        } catch (Exception $e) {
            error_log("Error extracting text from MD: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    protected function extractFromPDF($filePath) {
        try {
            // Simple extraction - just read the file
            $text = file_get_contents($filePath);
            
            if ($text === false) {
                throw new Exception("Failed to read PDF file");
            }
            
            // Get file stats
            $fileStats = stat($filePath);
            
            // Count pages by estimating (each ~3000 chars as a page for consistency)
            $estimatedPages = max(1, ceil(strlen($text) / 3000));
            
            return [
                'success' => true,
                'text' => $text,
                'pages' => $estimatedPages,
                'size' => $fileStats['size']
            ];
        } catch (Exception $e) {
            error_log("Error extracting text from PDF: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    protected function extractMultipleTexts($grade, $subject, $chapter, $questions) {
        $results = [];
        $totalPages = 0;
        $totalSize = 0;
        $combinedText = '';

        foreach ($questions as $question) {
            try {
                $result = $this->extractText($grade, $subject, $chapter, $question);
                if ($result['success']) {
                    $results[] = $result;
                    $totalPages += $result['pages'];
                    $totalSize += $result['size'];
                    $combinedText .= "\n\n=== " . $question . " ===\n\n" . $result['text'];
                }
            } catch (Exception $e) {
                error_log("Error extracting text from $question: " . $e->getMessage());
            }
        }

        if (empty($results)) {
            throw new Exception("Failed to extract text from any of the provided files");
        }

        return [
            'success' => true,
            'text' => trim($combinedText),
            'pages' => $totalPages,
            'size' => $totalSize,
            'count' => count($results)
        ];
    }
}
?>
