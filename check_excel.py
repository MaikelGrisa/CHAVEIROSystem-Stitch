import pandas as pd

try:
    df = pd.read_excel('/mnt/user-uploads/BASE.xlsx')
    print("Columns:", df.columns.tolist())
    print("Head:\n", df.head(10).to_string())
    print("Total rows:", len(df))
except Exception as e:
    print("Error:", e)
