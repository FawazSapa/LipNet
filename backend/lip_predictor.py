import cv2 as cv
import torch
import torch.nn as nn
import numpy as np

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Define the vocabulary
vocab = list("abcdefghijklmnopqrstuvwxyz'?!123456789 ")

class CharToNumMapper:
    def __init__(self, vocabulary):
        self.vocabulary = [''] + vocabulary
        self.char_to_num = {char: idx+1 for idx, char in enumerate(vocabulary)}
        self.num_to_char = {idx+1: char for idx, char in enumerate(vocabulary)}

    def inverse(self, nums):
        return [self.num_to_char.get(num.item(), '') for num in nums]

    def vocabulary_size(self):
        return len(self.vocabulary)

class LipReadingModel(nn.Module):
    def __init__(self, vocab_size):
        super(LipReadingModel, self).__init__()
        
        # Conv3D layers
        self.conv1 = nn.Sequential(
            nn.Conv3d(1, 128, kernel_size=3, padding='same'),
            nn.ReLU(),
            nn.MaxPool3d((1,2,2))
        )
        
        self.conv2 = nn.Sequential(
            nn.Conv3d(128, 256, kernel_size=3, padding='same'),
            nn.ReLU(),
            nn.MaxPool3d((1,2,2))
        )
        
        self.conv3 = nn.Sequential(
            nn.Conv3d(256, 75, kernel_size=3, padding='same'),
            nn.ReLU(),
            nn.MaxPool3d((1,2,2))
        )
        
        self.flatten_size = 75 * 5 * 17
        
        # Bidirectional LSTM layers
        self.lstm1 = nn.LSTM(input_size=self.flatten_size, hidden_size=128, bidirectional=True, batch_first=True)
        self.dropout1 = nn.Dropout(0.5)
        self.lstm2 = nn.LSTM(input_size=256, hidden_size=128, bidirectional=True, batch_first=True)
        self.dropout2 = nn.Dropout(0.5)
        
        # Final dense layer
        self.dense = nn.Linear(256, vocab_size + 1)
        self.softmax = nn.LogSoftmax(dim=-1)

    def forward(self, x):
        # Pass through Conv3D layers
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        
        # Reshape for LSTM
        batch_size, channels, frames, height, width = x.size()
        x = x.permute(0, 2, 1, 3, 4)  # Reorder to (batch, frames, channels, height, width)
        x = x.reshape(batch_size, frames, self.flatten_size)
        
        # Pass through LSTM layers
        x, _ = self.lstm1(x)
        x = self.dropout1(x)
        x, _ = self.lstm2(x)
        x = self.dropout2(x)
        
        # Final dense layer and softmax
        x = self.dense(x)
        x = self.softmax(x)
        
        return x

def process_video(video_path):
    cap = cv.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Error: Could not open video file at {video_path}")
    
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        gray_frame = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
        cropped_frame = gray_frame[190:236, 80:220]
        frames.append(torch.from_numpy(cropped_frame).float())
    
    cap.release()
    
    if not frames:
        raise ValueError(f"No frames were successfully read from {video_path}")
    
    frames_tensor = torch.stack(frames)
    mean = torch.mean(frames_tensor)
    std = torch.std(frames_tensor)
    normalized_frames = (frames_tensor - mean) / std
    
    return normalized_frames

def predict_from_video(video_path, model_path):
    # Initialize the mapper and model
    char_to_num = CharToNumMapper(vocab)
    model = LipReadingModel(vocab_size=char_to_num.vocabulary_size()).to(device)
    
    # Load the trained model - updated with weights_only=True
    model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    model.eval()
    
    # Process video and get frames
    frames = process_video(video_path)
    
    with torch.no_grad():
        # Prepare input
        frames = frames.unsqueeze(0).unsqueeze(0).to(device)
        
        # Get predictions
        outputs = model(frames)
        predictions = torch.argmax(outputs, dim=-1)
        
        # Decode the sequence
        pred_sequence = predictions[0].cpu()
        decoded_prediction = char_to_num.inverse(pred_sequence)
        
        # Clean up prediction
        final_text = ''
        prev_char = ''
        for char in decoded_prediction:
            if char != prev_char and char != '':
                final_text += char
            prev_char = char
        
        return final_text

