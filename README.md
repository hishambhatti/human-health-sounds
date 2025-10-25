# human-health-sounds
An interactive visualization to organize thousands of human health sounds via t-SNE

## Setup

Some commands to create a virtual environment
```python3 -m venv .venv```
```source .venv/bin/activate```
```pip install requirements.txt```

## Notebooks

Some of the ones that I based it off of:

1. https://github.com/Google-Health/hear/blob/master/notebooks/train_data_efficient_classifier.ipynb

- Loads HeAR (Health Acoustic Representations) model from HF
- Loads dataset of audio clips
- Creates the embeddings
- Classifier training

Model was based on HeAR: https://huggingface.co/google/hear

2. github.com/YuanGongND/vocalsound

- The VocalSound dataset that we are visualizing
- Says something about citing them in the paper, will do that if I make a paper about it

3. https://github.com/kylemcdonald/AudioNotebooks/blob/master/Generating%20Spectrograms.ipynb

- Used for generating spectrograms for processed audio

4. https://github.com/kylemcdonald/AudioNotebooks/blob/master/Fingerprints%20to%20t-SNE.ipynb and https://github.com/kylemcdonald/CloudToGrid

- Initial clustering of audio using t-SNE
- Mapping the t-SNE clustering to a 2D grid
