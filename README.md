# LipNet
---

## Running the Project

1. Clone the repository:
2. Install dependencies:
npm install

3. Start the development server:
npm run dev


---

## Setting up the Backend with Ollama

The backend translation service relies on **Ollama**, which runs locally. Follow these steps to set it up:

1. Install Ollama:
Follow the official instructions from Ollama's [GitHub repository](https://github.com/ollama/ollama).

2. Create a custom model for translation:

   cd backend


    ollama create frenchtutor -f Modelfile

4. Install Python dependencies:
pip install -r requirements.txt


**Note:** If you encounter missing dependencies, install them individually using pip install


4. Run the backend server:

python api.py



---

Files:
Backend:Contains transaltion(Ollama), Pre-processing,best_model
translation.ipynb: A seq-seq model which was discarded later as it didnt work as expected.
HaarCascade.py: Live lip detection
Lipnet.ipynb: Neural Network training,testing,validation,& saving best model
Rest of the files:Frontend

## Notes

- Ensure **Ollama** is properly set up and running for the translation service.
- For troubleshooting or further assistance, refer to Ollama's documentation or the repository's issue tracker.


