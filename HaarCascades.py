import cv2
import os
import torch
import numpy as np
import matplotlib.pyplot as plt

def detect_lips(frame, cascade_path='haarcascade_frontalface_default.xml'):

    # Load the Haar Cascade classifier
    lip_cascade = cv2.CascadeClassifier(cascade_path)
    
 
    if lip_cascade.empty():
        raise RuntimeError("Error: Cascade classifier not loaded")
    
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # We'll use face detection and estimate lip region
    faces = lip_cascade.detectMultiScale(gray, 1.3, 5)
    
    # If faces detected, estimate lip region
    if len(faces) > 0:
        x, y, w, h = faces[0]  
        # Estimate lip region (lower third of the face)
        lip_x = x + int(w * 0.2)
        lip_y = y + int(h * 0.7)
        lip_w = int(w * 0.6)
        lip_h = int(h * 0.3)
        
        return [lip_x, lip_y, lip_w, lip_h]
    
    return None

def capture_video_frames(output_path='lip_video.mpg', duration=1):
    """
    Capture and save only the lip region video while displaying full frame
    """
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FPS, 75)
    
    if not cap.isOpened():
        raise RuntimeError("Could not open webcam")
    
    
    fourcc = cv2.VideoWriter_fourcc(*'MPG1')
    out = cv2.VideoWriter(output_path, fourcc, 75, (140, 46))
    
    frame_count = 0
    max_frames = int(duration * 75)
    
    print("Starting video capture. Look directly at the camera and speak clearly.")
    
    while frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break
            
        
        display_frame = frame.copy()
        
        # Detect lips
        lips_region = detect_lips(frame)
        
        if lips_region:
            x, y, w, h = lips_region
            
            cv2.rectangle(display_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
           
            lip_frame = frame[y:y+h, x:x+w]
            gray_lip = cv2.cvtColor(lip_frame, cv2.COLOR_BGR2GRAY)
            resized_lip = cv2.resize(gray_lip, (140, 46))
            color_lip = cv2.cvtColor(resized_lip, cv2.COLOR_GRAY2BGR)
            
            # Write only the lip region
            out.write(color_lip)
            
            frame_count += 1
            
            # again this is for my personal use - Kannav 
            progress = int((frame_count / max_frames) * 100)
            cv2.putText(display_frame, 
                       f"Progress: {progress}%", 
                       (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 
                       1, 
                       (0, 255, 0), 
                       2)
            
        
        cv2.imshow('Face Detection', display_frame)
        
        # Exit on 'q' key
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    out.release()
    cv2.destroyAllWindows()
    print(f"\nVideo saved to {output_path}")
    return output_path

# Main execution
if __name__ == "__main__":
    capture_video_frames()