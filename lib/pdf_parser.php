<?php
class PDFParser {
    protected $pdfRoot;
    protected $pythonScript;

    public function __construct() {
        // Get the absolute path to the project root
        $projectRoot = dirname(dirname(__FILE__));
        
        // Set default paths relative to project root
        $this->pdfRoot = $projectRoot . '/public/pdf_repository/';
        $this->pythonScript = $projectRoot . '/scripts/pdf_extract.py';
        
        // Validate paths on construction
        if (!is_dir($this->pdfRoot)) {
            error_log("PDF root directory not found: " . $this->pdfRoot);
            throw new Exception("PDF repository directory not found");
        }
        
        if (!file_exists($this->pythonScript)) {
            error_log("Python script not found: " . $this->pythonScript);
            throw new Exception("Python extraction script not found");
        }
    }

    public function extractText($grade, $subject, $chapter, $questionName) {
        // Handle both single question and array of questions
        if (is_array($questionName)) {
            return $this->extractMultipleTexts($grade, $subject, $chapter, $questionName);
        }

        $pdfPath = $this->pdfRoot . "$grade/$subject/$chapter/$questionName.pdf";
        
        error_log("Attempting to read PDF from: " . $pdfPath);
        
        if (!file_exists($pdfPath)) {
            error_log("PDF file not found at: " . $pdfPath);
            throw new Exception("PDF file not found at: " . $pdfPath);
        }

        // Use Python script for extraction with increased output buffer
        $descriptorspec = array(
            0 => array("pipe", "r"),  // stdin
            1 => array("pipe", "w"),  // stdout
            2 => array("pipe", "w")   // stderr
        );
        
        $process = proc_open("python \"{$this->pythonScript}\" \"{$pdfPath}\"", $descriptorspec, $pipes);
        
        if (is_resource($process)) {
            // Read all output
            $output = stream_get_contents($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            
            // Close pipes
            fclose($pipes[1]);
            fclose($pipes[2]);
            
            // Close process
            $return_value = proc_close($process);
            
            if ($return_value !== 0) {
                error_log("Python script stderr: " . $stderr);
                throw new Exception("Failed to execute Python script");
            }
            
            error_log("Raw output length: " . strlen($output));
            
            $result = json_decode($output, true);
            
            if (!$result || !isset($result['success'])) {
                error_log("Failed to decode JSON response: " . json_last_error_msg());
                error_log("Raw output: " . substr($output, 0, 1000));
                throw new Exception("Invalid response from Python script");
            }
            
            if (!$result['success']) {
                throw new Exception("PDF extraction failed: " . ($result['error'] ?? 'Unknown error'));
            }
            
            return $result;
        }
        
        throw new Exception("Failed to start Python script");
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
            throw new Exception("Failed to extract text from any of the provided PDFs");
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
