import numpy as np
import binascii
import webcolors
import scipy.cluster
import pandas as pd
from fastai.vision.all import *
import sys

input = sys.argv[1]

def get_path_img(path):
    global path_img
    path_img = path

get_path_img(input)
path_network = ''
path_table = ''

def get_x(r): return r['image'] 
def get_y(r): return r['label_cat'].split(' ') 

learn = load_learner(path_network)
data = pd.read_csv(path_table)
colors = {
    '#000000': 'black',
    '#0000ff': 'blue',
    '#964b00': 'brown',
    '#ffb6c1': 'pink',
    '#800080': 'purple',
    '#008000': 'green',
    '#ff0000': 'red',
    '#ffffff': 'white',
    '#ffff00': 'yellow'
}

def classify(path):
    #Тип одежды
    im = PILImage.create(path)
    pred, pred_idx, probs = learn.predict(im)
    if len(pred) == 1:
        return 'None'
    if pred[1] == 'False' or pred[1] == 'True':
        pred[1] = pred[0]
    type = pred[1]
    
    #Цвет середины в ргб
    im = im.resize((150, 150)).crop((50, 50, 100, 100))
    ar = np.asarray(im)
    shape = ar.shape
    ar = ar.reshape(np.product(shape[:2]), shape[2]).astype(float)
    codes, dist = scipy.cluster.vq.kmeans(ar, 5)
    vecs, dist = scipy.cluster.vq.vq(ar, codes)
    counts, bins = np.histogram(vecs, len(codes))
    rgb = codes[np.argmax(counts)]
    
    #Переводим цвет в слово
    min_colors = {}
    for key, name in colors.items():
        r_c, g_c, b_c = webcolors.hex_to_rgb(key)
        rd = (r_c - rgb[0]) ** 2
        gd = (g_c - rgb[1]) ** 2
        bd = (b_c - rgb[2]) ** 2
        min_colors[(rd + gd + bd)] = name
    color_name = min_colors[min(min_colors.keys())]
    links = data.loc[(data['Type'] == type) & (data['Color'] == color_name)]['Link'].sample(frac=1).values[:5]
    return links

output = classify(path_img)
print(output)
sys.stdout.flush()

