import torch
from torch import nn
import torch.nn.functional as F
from torchvision.models import resnet50


class Net(nn.Module):
    def __init__(self, num_layers=2, hidden_size=512, feature_dim=2048, bidirectional=True, num_classes=4):
        super().__init__()

        base_model = resnet50(weights="IMAGENET1K_V2")
        self.cnn = nn.Sequential(*list(base_model.children())[:-2])
        self.aap = nn.AdaptiveAvgPool2d((1, 1))

        self.feature_dim = feature_dim

        self.lstm = nn.LSTM(
            input_size=self.feature_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=bidirectional
        )

        lstm_output = hidden_size * (2 if bidirectional else 1)

        self.classifier = nn.Sequential(
            nn.Linear(lstm_output, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes)

        )

    def forward(self, x):
        B, T, C, H, W = x.shape
        x = x.view(B * T, C, H, W)

        feats = self.cnn(x)
        feats = self.aap(feats).flatten(1)

        feats = feats.view(B, T, -1)

        lstm_out, _ = self.lstm(feats)
        lstm_out = lstm_out.mean(dim=1)

        out = self.classifier(lstm_out)
        return out

    def predict(self, x):
        self.eval()

        if len(x.shape) == 4:
            x = x.unsqueeze(0)

        with torch.no_grad():
            out = self.forward(x)

        out = torch.softmax(out, dim=1)
        res = torch.argmax(out, dim=1)

        return res.item()

device = "cuda" if torch.cuda.is_available() else "cpu"
model = Net()
model.to()
print(f"Tactics tracing model successfully loaded on device: {device}")

link = "models/tactic_model_v01.pt"
model.load_state_dict(torch.load(link, map_location=device))
# print(next(model.parameters()).dtype)

