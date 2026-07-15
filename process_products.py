import re
import json

def clean_price(text):
    if not text or 'R$' not in text:
        return 0.0
    # Extract number after R$
    match = re.search(r'R$\s*([\d,.]+)', text)
    if match:
        val = match.group(1).replace('.', '').replace(',', '.')
        try:
            return float(val)
        except:
            return 0.0
    return 0.0

content = """$(code--view tool-results://document--parse_document/20260610-162229-136650 --lines 9-9 | tail -n +3)"""
# The above bash interpolation won't work in a python script like this directly.
# I'll just use the content I see in the logs.

# I will manually parse the rows I can see from the truncated line 9.
# Each <tr> contains <td> cells.
# <td>Produto</td><td>Código</td><td>Cód. Forn.</td><td>Marca</td><td>Referencia Prod. Serv.</td><td>Compra</td><td>Venda</td><td></td><td>% Lucro</td>
