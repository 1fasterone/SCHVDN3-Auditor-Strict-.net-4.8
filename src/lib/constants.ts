export const SHVDN3_TEMPLATE = `using System;
using System.Windows.Forms;
using GTA;
using GTA.Native;

namespace MyGtaMod
{
    public class MyScript : Script
    {
        public MyScript()
        {
            // Constructor: Initialize your script here
            Tick += OnTick;
            KeyDown += OnKeyDown;
            KeyUp += OnKeyUp;
            
            // Interval in milliseconds (0 = every frame)
            Interval = 0;
        }

        private void OnTick(object sender, EventArgs e)
        {
            // Main script logic runs every frame
        }

        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            // Handle key presses
            if (e.KeyCode == Keys.F10)
            {
                Notification.Show("Script is running!");
            }
        }

        private void OnKeyUp(object sender, KeyEventArgs e)
        {
            // Handle key releases
        }
    }
}
`;
