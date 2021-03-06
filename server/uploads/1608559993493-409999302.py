#!/usr/bin/python3.6   
import subprocess
import re
import requests
import time

# Store Mac address of all nodes here
saved = {
    '5c:93:a2:e9:5d:d1': 'Lenovo G50',
    '9a:5c:88:49:98:79': 'Realme 5s'
}

# Set wireless interface using ifconfig
interface = "wlp2s0"

mac_regex = re.compile(r'([a-zA-Z0-9]{2}:){5}[a-zA-Z0-9]{2}')


def parse_arp():
    arp_out = subprocess.check_output(f'arp -e -i {interface}', shell=True).decode('utf-8')
    if 'no match found' in arp_out:
        return None

    result = []
    for lines in arp_out.strip().split('\n'):
        line = lines.split()
        if interface in line and '(incomplete)' not in line:
            for element in line:
                # If its a mac addr
                if mac_regex.match(element):
                    result.append((line[0], element))
    return result


def get_mac_vendor(devices):
    num = 0
    for device in devices:
        try:
            url = f"http://api.macvendors.com/{device[1]}"
            try:
                vendor = requests.get(url).text
            except Exception as e:
                print(e)
                vendor = None

        except Exception as e:
            print("Error occured while getting mac vendor", e)

        num += 1
        print_device(device, num, vendor)
        time.sleep(1)

def print_device(device, num=0, vendor=None):
    device_name = saved[device[1]] if device[1] in saved else 'unrecognised !!'

    print(f'\n{num})', device_name,  '\nVendor:', vendor, '\nMac:', device[1], '\nIP: ',device[0])

if __name__ == '__main__':
    print('Retrieving connected devices ..')

    devices = parse_arp()

    if not devices:
        print('No devices found!')

    else:
        print('Retrieving mac vendors ..')
        try:
            get_mac_vendor(devices)

        except KeyboardInterrupt as e:
            num = 0
            for device in devices:
                num += 1
                print_device(device, num)