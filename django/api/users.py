USERS = [
    {
        'username':    'alice',
        'first_name':  'Alice',
        'last_name':   'Dupont',
        'extension':   '004',
        'sip_password': 'my_password',
    },
    {
        'username':    'bob',
        'first_name':  'Bob',
        'last_name':   'Martin',
        'extension':   '005',
        'sip_password': 'my_password',
    },
    {
        'username':    'charlie',
        'first_name':  'Charlie',
        'last_name':   'Bernard',
        'extension':   '006',
        'sip_password': 'my_password',
    },
]


def get_user_by_extension(extension):
    return next((u for u in USERS if u['extension'] == extension), None)
