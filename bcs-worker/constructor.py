import torch
from torch import nn
import torch.nn.functional as F

class ConvBlock(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, stride, padding):
        super().__init__()
        self.conv = nn.Conv2d(in_channels=in_channels, out_channels=out_channels, kernel_size=kernel_size, stride=stride, padding=padding)
        self.bnorm = nn.BatchNorm2d(out_channels)
    def forward(self, x):
        return F.relu(self.bnorm(self.conv(x)))